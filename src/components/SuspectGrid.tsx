import type { SuspectProfile } from '@/types/game'
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
  caseBundle?: {
    killer: SuspectProfile
    solution?: {
      killerMotive?: string
      relationship?: string
      finalClue?: string
    }
  }
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

  if (showVictory && caseBundle) {
    return (
      <div className="victory-screen" style={{ padding: '2rem', background: '#1a1a1a', color: '#fff', height: '100%', overflowY: 'auto' }}>
        <h1 style={{ color: '#10b981', fontSize: '3rem', marginBottom: '1rem' }}>VỤ ÁN ĐÃ ĐƯỢC PHÁ!</h1>
        <p style={{ fontSize: '1.2rem' }}>Chúc mừng thám tử! Bạn đã tìm ra hung thủ và công lý đã được thực thi.</p>

        <div style={{ marginTop: '2rem', border: '1px solid #444', padding: '1.5rem', borderRadius: '8px', background: '#2c2c2c' }}>
          <h2 style={{ color: '#f0a500' }}>HỒ SƠ VỤ ÁN</h2>
          <p><strong>Hung thủ:</strong> {caseBundle.killer.fullName}</p>
          <p><strong>Động cơ:</strong> {caseBundle.solution?.killerMotive || 'Không rõ'}</p>
          <p><strong>Mối quan hệ:</strong> {caseBundle.solution?.relationship || 'Không rõ'}</p>
          <p><strong>Manh mối quan trọng:</strong> {caseBundle.solution?.finalClue || 'Không rõ'}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '2rem', padding: '1rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem' }}
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

      <div className="grid-container">
        {currentSuspects.map((suspect) => {
          const isSelected = shortlistedSuspectIds.includes(suspect.id)
          const isLocked = lockedSuspectId === suspect.id

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setSelectedProfile(null)}>
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
                <strong>Ghi chú điều tra:</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                  {selectedProfile.alibi || 'Chưa có lời khai.'}
                </p>
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
