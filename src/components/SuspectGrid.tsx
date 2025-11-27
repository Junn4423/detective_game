import type { CaseClueBundle, SuspectProfile } from '@/types/game'
import { useState, useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'

interface SuspectGridProps {
  suspects?: SuspectProfile[]
  shortlistedSuspectIds: string[]
  lockedSuspectId?: string
  phase: 'investigating' | 'accusing' | 'solved' | 'idle' | 'loading'
  toggleShortlist: (suspectId: string) => void
  accuseSuspect: (suspectId: string) => void
  confirmShortlist: () => void
  caseBundle?: CaseClueBundle
}

export const SuspectGrid = ({
  suspects,
  shortlistedSuspectIds,
  lockedSuspectId,
  phase,
  toggleShortlist,
  accuseSuspect,
  confirmShortlist,
  caseBundle,
}: SuspectGridProps) => {
  const [selectedProfile, setSelectedProfile] = useState<SuspectProfile | null>(null)
  const [showGameOver, setShowGameOver] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const setFocusedCitizenId = useGameStore((state) => state.setFocusedCitizenId)
  const setActiveTab = useGameStore((state) => state.setActiveTab)
  const captureOutcome = useGameStore((state) => state.captureOutcome)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset pagination when phase changes
  useEffect(() => {
    setCurrentPage(1)
    setSearchTerm('')
  }, [phase])

  const handleAccuse = (suspectId: string) => {
    if (phase === 'accusing') {
      const isCorrect = suspectId === caseBundle?.killer.id
      if (isCorrect) {
        setShowVictory(true)
        accuseSuspect(suspectId)
      } else {
        setShowGameOver(true)
      }
    } else {
      toggleShortlist(suspectId)
    }
  }

  const handleViewOnMap = (suspectId: string) => {
    setFocusedCitizenId(suspectId)
    setActiveTab('map')
    setSelectedProfile(null)
  }

  const accompliceIds: string[] = caseBundle?.accompliceIds ?? []
  const accompliceCount = accompliceIds.length
  const accompliceProgress = accompliceIds.filter((id: string) => shortlistedSuspectIds.includes(id)).length
  const allAccomplicesFound = accompliceCount > 0 && accompliceIds.every((id: string) => shortlistedSuspectIds.includes(id))

  if (showVictory && caseBundle) {
    const isFullCapture = captureOutcome === 'captured'
    return (
      <div className="victory-screen" style={{ padding: '2rem', background: '#1a1a1a', color: '#fff', height: '100%', overflowY: 'auto' }}>
        <h1 style={{ color: isFullCapture ? '#10b981' : '#f97316', fontSize: '3rem', marginBottom: '1rem' }}>
          {isFullCapture ? 'VỤ ÁN ĐÃ ĐƯỢC PHÁ!' : 'CHƯA THỂ BẮT GIỮ HUNG THỦ'}
        </h1>
        <p style={{ fontSize: '1.2rem' }}>
          {isFullCapture
            ? 'Chúc mừng thám tử! Bạn đã bắt gọn hung thủ và toàn bộ đồng phạm.'
            : 'Bạn đã xác định đúng hung thủ nhưng chưa thu thập đủ lời khai của đồng phạm để tiến hành bắt giữ.'}
        </p>

        <div style={{ marginTop: '2rem', border: '1px solid #444', padding: '1.5rem', borderRadius: '8px', background: '#2c2c2c' }}>
          <h2 style={{ color: '#f0a500' }}>HỒ SƠ VỤ ÁN</h2>
          <p><strong>Hung thủ:</strong> {caseBundle.killer.fullName}</p>
          <p><strong>Động cơ:</strong> {caseBundle.solution?.killerMotive || 'Không rõ'}</p>
          <p><strong>Mối quan hệ:</strong> {caseBundle.solution?.relationship || 'Không rõ'}</p>
          <p><strong>Manh mối quan trọng:</strong> {caseBundle.solution?.finalClue || 'Không rõ'}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '2rem', padding: '1rem 2rem', background: isFullCapture ? '#10b981' : '#f97316', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          Nhận vụ án mới
        </button>
      </div>
    )
  }

  if (showGameOver && caseBundle) {
    return (
      <div className="game-over-screen" style={{ padding: '2rem', background: '#1a1a1a', color: '#fff', height: '100%', overflowY: 'auto' }}>
        <h1 style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>THẤT BẠI</h1>
        <p style={{ fontSize: '1.2rem' }}>Bạn đã bắt nhầm người. Hung thủ thực sự đã trốn thoát.</p>

        <div style={{ marginTop: '2rem', border: '1px solid #444', padding: '1.5rem', borderRadius: '8px', background: '#2c2c2c' }}>
          <h2 style={{ color: '#f0a500' }}>HỒ SƠ VỤ ÁN ĐƯỢC GIẢI MÃ</h2>
          <p><strong>Hung thủ:</strong> {caseBundle.killer.fullName}</p>
          <p><strong>Động cơ:</strong> {caseBundle.solution?.killerMotive || 'Không rõ'}</p>
          <p><strong>Mối quan hệ:</strong> {caseBundle.solution?.relationship || 'Không rõ'}</p>
          <p><strong>Manh mối quan trọng:</strong> {caseBundle.solution?.finalClue || 'Không rõ'}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '2rem', padding: '1rem 2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          Thử lại vụ án mới
        </button>
      </div>
    )
  }

  if (!suspects?.length) {
    return (
      <section className="panel">
        <h2>Hồ sơ nghi phạm</h2>
        <p>Chưa có danh sách nghi phạm.</p>
      </section>
    )
  }

  // Filter suspects based on phase and search term
  const filteredByPhase =
    phase === 'accusing' || phase === 'solved'
      ? suspects.filter((s) => shortlistedSuspectIds.includes(s.id))
      : suspects

  const allDisplaySuspects = filteredByPhase.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.occupation.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination Logic
  const totalPages = Math.ceil(allDisplaySuspects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentSuspects = allDisplaySuspects.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <section className="panel suspect-panel">
      <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Hồ sơ nghi phạm</h2>
          <span>{phase === 'investigating' ? `Đã chọn: ${shortlistedSuspectIds.length}/10` : 'Giai đoạn buộc tội'}</span>
          {phase === 'investigating' && shortlistedSuspectIds.length === 10 && (
            <button
              onClick={confirmShortlist}
              style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Chốt danh sách
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc nghề nghiệp..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '100%',
            fontFamily: 'Courier New'
          }}
        />
      </div>
      {accompliceCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#facc15', marginBottom: '0.75rem' }}>
          <span>Đồng phạm bị lộ: {accompliceProgress}/{accompliceCount}</span>
          {!allAccomplicesFound && <span style={{ color: '#f97316' }}>Cần đủ đồng phạm để mở lời khai 2</span>}
        </div>
      )}

      <div className="grid-container">
        {currentSuspects.map((suspect) => {
          const isSelected = shortlistedSuspectIds.includes(suspect.id)
          const isLocked = lockedSuspectId === suspect.id
          const isAccomplice = accompliceIds.includes(suspect.id)

          return (
            <div
              key={suspect.id}
              className={`suspect-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => setSelectedProfile(suspect)}
            >
              <img src={suspect.portrait} alt={suspect.fullName} />
              <div className="info">
                <div className="name">{suspect.fullName}</div>
                <div className="occupation">{suspect.occupation}</div>
                <div className="meta">Age: {suspect.age} | {suspect.nationality}</div>
                <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#94a3b8', minHeight: '3rem' }}>
                  "{suspect.testimony.action}"
                  <br />
                  <span style={{ color: '#38bdf8' }}>{suspect.testimony.locationLabel}</span>
                </div>
                {isAccomplice && (
                  <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.3rem' }}>
                    Nghi vấn đồng phạm •{' '}
                    {allAccomplicesFound ? 'đã mở lời khai 2' : 'cần thẩm vấn sâu'}
                  </div>
                )}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    if (phase === 'investigating') {
                      toggleShortlist(suspect.id)
                    } else if (phase === 'accusing') {
                      handleAccuse(suspect.id)
                    } else {
                      setSelectedProfile(suspect)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: phase === 'investigating'
                      ? isSelected ? '#ef4444' : '#2563eb'
                      : '#b91c1c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}
                >
                  {phase === 'investigating'
                    ? isSelected ? 'Bỏ chọn' : 'Chọn'
                    : 'Buộc tội'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid #334155', marginTop: 'auto' }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '0.5rem 1rem', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            &laquo; Trước
          </button>
          <span style={{ display: 'flex', alignItems: 'center', color: '#e5e5e5', fontFamily: 'Courier New', fontWeight: 'bold' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.5rem 1rem', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Sau &raquo;
          </button>
        </div>
      )}

      {/* Detailed Profile Modal */}
      {selectedProfile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedProfile(null)}
        >
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', color: '#333', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedProfile(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <img src={selectedProfile.portrait} alt={selectedProfile.fullName} style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover' }} />
              <div>
                <h2 style={{ margin: 0, color: '#1a1a1a' }}>{selectedProfile.fullName}</h2>
                <p style={{ margin: '0.5rem 0', color: '#666' }}>{selectedProfile.occupation}</p>
                <div style={{ fontSize: '0.9rem', color: '#444' }}>
                  <p><strong>Tuổi:</strong> {selectedProfile.age}</p>
                  <p><strong>Quốc tịch:</strong> {selectedProfile.nationality}</p>
                  <p><strong>Nơi ở:</strong> {selectedProfile.residence}</p>
                </div>
                <button
                  onClick={() => handleViewOnMap(selectedProfile.id)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.3rem 0.6rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  📍 Xem trên bản đồ
                </button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p><strong>Ngày sinh:</strong> {new Date(selectedProfile.dob).toLocaleDateString()}</p>
              <p><strong>Điện thoại:</strong> {selectedProfile.cell}</p>
              <p><strong>ID:</strong> {selectedProfile.idNumber}</p>
              <p><strong>Đăng ký:</strong> {new Date(selectedProfile.registered).toLocaleDateString()}</p>
              <p><strong>Email:</strong> {selectedProfile.email}</p>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
                <strong>Lời khai chính:</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                  {selectedProfile.testimony.narrative}
                </p>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                  Địa điểm: {selectedProfile.testimony.locationLabel} • Khung giờ: {selectedProfile.testimony.timeframe}
                </p>
                {allAccomplicesFound && selectedProfile.secondaryTestimony ? (
                  <div style={{ marginTop: '0.8rem', padding: '0.6rem', borderRadius: '4px', background: '#fef3c7', border: '1px dashed #f59e0b' }}>
                    <strong>Lời khai 2:</strong>
                    <p style={{ margin: '0.4rem 0 0 0' }}>{selectedProfile.secondaryTestimony.narrative}</p>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                {phase === 'investigating' && (
                  <button
                    onClick={() => {
                      toggleShortlist(selectedProfile.id)
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: shortlistedSuspectIds.includes(selectedProfile.id) ? '#ef4444' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {shortlistedSuspectIds.includes(selectedProfile.id) ? 'Bỏ chọn' : 'Chọn vào danh sách'}
                  </button>
                )}
                {phase === 'accusing' && (
                  <button
                    onClick={() => handleAccuse(selectedProfile.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#b91c1c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    BUỘC TỘI
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
