import { useEffect, useRef, useState } from 'react'
import './App.css'
import { InvestigationMap } from '@/components/InvestigationMap'
import { SuspectGrid } from '@/components/SuspectGrid'
import { StatusBanner } from '@/components/StatusBanner'
import { ArchiveListOverlay } from '@/components/ArchiveListOverlay'
import { useCitizenDataset } from '@/hooks/useCitizenDataset'
import { useDetectiveCase } from '@/hooks/useDetectiveCase'
import { useArchivedCaseList } from '@/hooks/useArchivedCaseList'
import { useGameStore } from '@/store/gameStore'
import doorOpenVideo from '@/assets/video/dooropen.mp4'

type IntroStage = 'menu' | 'zooming' | 'video' | 'fade' | 'hidden'

const IntroOverlay = ({
  stage,
  onStart,
  onVideoEnded,
  onShowArchives,
}: {
  stage: IntroStage
  onStart: () => void
  onVideoEnded: () => void
  onShowArchives: () => void
}) => {
  if (stage === 'hidden') return null

  return (
    <>
      {(stage === 'menu' || stage === 'zooming') && (
        <div className={`start-menu ${stage === 'zooming' ? 'start-menu--zoom' : ''}`}>
          <div className="start-menu__content">
            <h1>HỒ SƠ MẬT</h1>
            <p>Chuỗi hồ sơ mật vụ “Detective Leaflet”. Sẵn sàng truy ra sự thật?</p>
            <div className="start-menu__actions">
              <button onClick={onStart} disabled={stage !== 'menu'}>
                Bắt đầu tìm ra sự thật
              </button>
              <button className="start-menu__secondary" onClick={onShowArchives} disabled={stage !== 'menu'}>
                Danh sách hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
      {stage === 'video' && (
        <div className="intro-video-overlay">
          <video
            key="door-intro"
            src={doorOpenVideo}
            className="intro-video"
            playsInline
            autoPlay
            preload="auto"
            onEnded={onVideoEnded}
          />
        </div>
      )}
      {stage === 'fade' && <div className="intro-fade" />}
    </>
  )
}

function App() {
  const { assemblyQuery, clueQuery, archivedCaseQuery } = useDetectiveCase()
  const citizenQuery = useCitizenDataset()
  const caseBundle = useGameStore((state) => state.caseBundle)
  const phase = useGameStore((state) => state.phase)
  const error = useGameStore((state) => state.error)
  const lockedSuspectId = useGameStore((state) => state.lockedSuspectId)
  const shortlistedSuspectIds = useGameStore((state) => state.shortlistedSuspectIds)
  const highlightedClueId = useGameStore((state) => state.highlightedClueId)
  const activeTab = useGameStore((state) => state.activeTab)
  const archivedCaseCode = useGameStore((state) => state.archivedCaseCode)
  const activeCaseCode = useGameStore((state) => state.activeCaseCode)

  const toggleShortlist = useGameStore((state) => state.toggleShortlist)
  const confirmShortlist = useGameStore((state) => state.confirmShortlist)
  const accuseSuspect = useGameStore((state) => state.accuseSuspect)
  const restartCurrentCase = useGameStore((state) => state.restartCurrentCase)
  const startNewCase = useGameStore((state) => state.startNewCase)
  const loadArchivedCase = useGameStore((state) => state.loadArchivedCase)
  const setActiveTab = useGameStore((state) => state.setActiveTab)
  const hasActivatedCase = useGameStore((state) => state.hasActivatedCase)

  const [introStage, setIntroStage] = useState<IntroStage>(() => (hasActivatedCase ? 'hidden' : 'menu'))
  const [showCaseList, setShowCaseList] = useState(false)
  const [pendingArchiveCode, setPendingArchiveCode] = useState<string | undefined>(undefined)
  const zoomTimerRef = useRef<number | undefined>(undefined)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const caseTriggeredRef = useRef(false)
  const archiveListQuery = useArchivedCaseList(showCaseList)

  useEffect(() => {
    return () => {
      if (zoomTimerRef.current) window.clearTimeout(zoomTimerRef.current)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [])

  const beginIntroSequence = (archiveCode?: string) => {
    if (introStage !== 'menu') return
    caseTriggeredRef.current = false
    setPendingArchiveCode(archiveCode)
    setIntroStage('zooming')
    zoomTimerRef.current = window.setTimeout(() => {
      setIntroStage('video')
    }, 450)
  }

  const handleStartSequence = () => {
    beginIntroSequence()
  }

  const handleVideoEnded = () => {
    setIntroStage('fade')
  }

  const handleShowArchiveList = () => {
    if (introStage !== 'menu') return
    setShowCaseList(true)
  }

  const handleSelectArchivedCase = (caseCode: string) => {
    setShowCaseList(false)
    beginIntroSequence(caseCode)
  }

  useEffect(() => {
    if (introStage === 'fade' && !caseTriggeredRef.current) {
      caseTriggeredRef.current = true
      if (pendingArchiveCode) {
        loadArchivedCase(pendingArchiveCode)
      } else {
        startNewCase()
      }
      hideTimerRef.current = window.setTimeout(() => {
        setIntroStage('hidden')
        setPendingArchiveCode(undefined)
      }, 1200)
    }
  }, [introStage, loadArchivedCase, pendingArchiveCode, startNewCase])

  const archiveFetching = archivedCaseQuery.isFetching
  const baseLoading = citizenQuery.isPending || assemblyQuery.isPending || clueQuery.isPending
  const isLoading = baseLoading || archiveFetching
  const displayCaseCode = activeCaseCode ?? caseBundle?.victim?.victimId ?? caseBundle?.victim?.id
  const replayDisabled = !archivedCaseCode || archiveFetching || baseLoading

  return (
    <>
      {introStage !== 'hidden' && (
        <IntroOverlay
          stage={introStage}
          onStart={handleStartSequence}
          onVideoEnded={handleVideoEnded}
          onShowArchives={handleShowArchiveList}
        />
      )}
      <ArchiveListOverlay
        visible={showCaseList}
        cases={archiveListQuery.data}
        isLoading={archiveListQuery.isLoading}
        onClose={() => setShowCaseList(false)}
        onRefresh={() => archiveListQuery.refetch()}
        onSelectCase={handleSelectArchivedCase}
      />
      <div className="app-shell">
      {/* Sidebar - Case File */}
      <aside className="sidebar">
        <div style={{ padding: '1.5rem', background: '#1a1a1a', borderBottom: '1px solid #444' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f0a500', fontFamily: 'Courier New' }}>HỒ SƠ VỤ ÁN</h1>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
            Mã hồ sơ: #{displayCaseCode ? displayCaseCode.slice(0, 8) : 'Unknown'}
          </div>
          {caseBundle?.caseTitle ? (
            <div style={{ fontSize: '0.85rem', color: '#fbbf24', marginTop: '0.25rem' }}>{caseBundle.caseTitle}</div>
          ) : null}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={restartCurrentCase}
              disabled={replayDisabled}
              title={replayDisabled ? 'Chỉ khả dụng sau khi hồ sơ đã được lưu' : undefined}
              style={{
                flex: 1,
                padding: '0.3rem',
                fontSize: '0.8rem',
                cursor: replayDisabled ? 'not-allowed' : 'pointer',
                background: replayDisabled ? '#475569' : '#334155',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                opacity: replayDisabled ? 0.6 : 1,
              }}
            >
              Lật lại vụ án
            </button>
            <button
              onClick={startNewCase}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '2px' }}
            >
              Vụ án mới
            </button>
          </div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
            {archivedCaseCode ? `Đã lưu hồ sơ #${archivedCaseCode.slice(0, 8)}` : 'Tạo xong hồ sơ để có thể lật lại.'}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <StatusBanner phase={phase} error={error} isLoading={isLoading} />

          {caseBundle?.accompliceCount ? (
            <div className="paper-card" style={{ marginTop: '1rem', background: '#e0f2fe', border: '1px dashed #0284c7' }}>
              <strong>Thông tin đồng phạm:</strong>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#0f172a' }}>
                Theo điều tra ban đầu có {caseBundle.accompliceCount} đồng phạm che chắn cho hung thủ. Khi khoanh vùng đủ số lượng này, chúng sẽ khai tọa độ ẩn náu để bạn chỉ điểm trên bản đồ.
              </p>
            </div>
          ) : null}

          {caseBundle?.story && (
            <div className="paper-card" style={{ marginTop: '1rem', transform: 'rotate(1deg)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c', borderBottom: '2px solid #b91c1c', display: 'inline-block' }}>Báo Cáo Sơ Bộ</h3>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#333', fontFamily: 'Courier New' }}>
                {caseBundle.story}
              </p>
            </div>
          )}

          {caseBundle?.clueDrafts?.map((clue) => (
            <div key={clue.id} className="paper-card" style={{ marginTop: '1rem', background: '#fffbeb' }}>
              <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '0.2rem' }}>{clue.title}</div>
              <div style={{ fontSize: '0.9rem', color: '#444' }}>{clue.summary}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Board */}
      <main className="main-content">
        {/* Navigation Tabs */}
        <nav style={{ padding: '1rem', display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              padding: '0.5rem 1.5rem',
              background: activeTab === 'map' ? '#f0a500' : '#fff',
              border: 'none',
              borderRadius: '2px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
              transform: activeTab === 'map' ? 'translateY(2px)' : 'none'
            }}
          >
            BẢN ĐỒ ĐIỀU TRA
          </button>
          <button
            onClick={() => setActiveTab('suspects')}
            style={{
              padding: '0.5rem 1.5rem',
              background: activeTab === 'suspects' ? '#f0a500' : '#fff',
              border: 'none',
              borderRadius: '2px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
              transform: activeTab === 'suspects' ? 'translateY(2px)' : 'none'
            }}
          >
            HỒ SƠ NGHI PHẠM ({caseBundle?.suspects.length ?? 0})
          </button>
        </nav>

        {/* Content Area */}
        <div style={{ flex: 1, position: 'relative', padding: '1rem', overflow: 'hidden' }}>
          <div style={{
            display: activeTab === 'map' ? 'block' : 'none',
            height: '100%',
            background: '#fff',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <InvestigationMap
              victim={caseBundle?.victim}
              suspects={caseBundle?.suspects}
              clues={caseBundle?.clueDrafts}
              highlightedClueId={highlightedClueId}
              hideoutHint={caseBundle?.hideoutHint}
              accompliceIds={caseBundle?.accompliceIds}
            />
          </div>

          <div style={{
            display: activeTab === 'suspects' ? 'block' : 'none',
            height: '100%',
          }}>
            <SuspectGrid
              suspects={caseBundle?.suspects}
              shortlistedSuspectIds={shortlistedSuspectIds}
              lockedSuspectId={lockedSuspectId}
              phase={phase}
              toggleShortlist={toggleShortlist}
              confirmShortlist={confirmShortlist}
              accuseSuspect={accuseSuspect}
              caseBundle={caseBundle ?? undefined}
            />
          </div>
        </div>
      </main>
      </div>
    </>
  )
}

export default App
