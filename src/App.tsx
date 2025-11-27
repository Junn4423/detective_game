import './App.css'
import { InvestigationMap } from '@/components/InvestigationMap'
import { SuspectGrid } from '@/components/SuspectGrid'
import { StatusBanner } from '@/components/StatusBanner'
import { useCitizenDataset } from '@/hooks/useCitizenDataset'
import { useDetectiveCase } from '@/hooks/useDetectiveCase'
import { useGameStore } from '@/store/gameStore'

function App() {
  const { assemblyQuery, clueQuery } = useDetectiveCase()
  const citizenQuery = useCitizenDataset()
  const caseBundle = useGameStore((state) => state.caseBundle)
  const phase = useGameStore((state) => state.phase)
  const error = useGameStore((state) => state.error)
  const lockedSuspectId = useGameStore((state) => state.lockedSuspectId)
  const shortlistedSuspectIds = useGameStore((state) => state.shortlistedSuspectIds)
  const highlightedClueId = useGameStore((state) => state.highlightedClueId)
  const activeTab = useGameStore((state) => state.activeTab)

  const toggleShortlist = useGameStore((state) => state.toggleShortlist)
  const confirmShortlist = useGameStore((state) => state.confirmShortlist)
  const accuseSuspect = useGameStore((state) => state.accuseSuspect)
  const restartCurrentCase = useGameStore((state) => state.restartCurrentCase)
  const startNewCase = useGameStore((state) => state.startNewCase)
  const setActiveTab = useGameStore((state) => state.setActiveTab)

  const isLoading = citizenQuery.isPending || assemblyQuery.isPending || clueQuery.isPending

  if (phase === 'idle') {
    return (
      <div className="start-screen" style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#1a1a1a',
        color: '#f0a500',
        fontFamily: 'Courier New'
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '2rem', textShadow: '2px 2px 4px #000' }}>HỒ SƠ TRINH THÁM</h1>
        <p style={{ color: '#ccc', marginBottom: '3rem', fontSize: '1.2rem' }}>Hệ thống điều tra tội phạm cấp cao</p>
        <button
          onClick={startNewCase}
          style={{
            padding: '1rem 3rem',
            fontSize: '1.5rem',
            background: '#b91c1c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            fontWeight: 'bold'
          }}
        >
          BẮT ĐẦU PHÁ ÁN
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Sidebar - Case File */}
      <aside className="sidebar">
        <div style={{ padding: '1.5rem', background: '#1a1a1a', borderBottom: '1px solid #444' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f0a500', fontFamily: 'Courier New' }}>HỒ SƠ VỤ ÁN</h1>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>Mã hồ sơ: #{caseBundle?.victim?.id.slice(0, 8) ?? 'Unknown'}</div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={restartCurrentCase}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', background: '#334155', color: 'white', border: 'none', borderRadius: '2px' }}
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
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <StatusBanner phase={phase} error={error} isLoading={isLoading} onReset={restartCurrentCase} />

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
  )
}

export default App
