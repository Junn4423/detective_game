import type { ArchivedCaseSummary } from '@/services/caseArchiveService'

interface ArchiveListOverlayProps {
  visible: boolean
  cases?: ArchivedCaseSummary[]
  isLoading: boolean
  onClose: () => void
  onRefresh: () => void
  onSelectCase: (caseCode: string) => void
}

export const ArchiveListOverlay = ({
  visible,
  cases,
  isLoading,
  onClose,
  onRefresh,
  onSelectCase,
}: ArchiveListOverlayProps) => {
  if (!visible) return null

  return (
    <div className="archive-overlay">
      <div className="archive-panel">
        <header className="archive-header">
          <div>
            <p className="archive-eyebrow">DANH SÁCH HỒ SƠ</p>
            <h2>Kho lưu trữ mật</h2>
            <p className="archive-subtext">Chọn một hồ sơ để lật lại ngay lập tức.</p>
          </div>
          <div className="archive-actions">
            <button onClick={onRefresh} disabled={isLoading}>
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button onClick={onClose}>Đóng</button>
          </div>
        </header>
        <div className="archive-list">
          {isLoading ? (
            <p className="archive-placeholder">Đang tải danh sách hồ sơ...</p>
          ) : !cases?.length ? (
            <p className="archive-placeholder">Chưa có hồ sơ nào được lưu.</p>
          ) : (
            cases.map((item) => (
              <div key={item.caseCode} className="archive-item">
                <div>
                  <p className="archive-title">{item.title}</p>
                  <p className="archive-meta">
                    Mã #{item.caseCode}
                    {item.generatedAt ? ` · ${new Date(item.generatedAt).toLocaleString('vi-VN')}` : ''}
                  </p>
                </div>
                <button onClick={() => onSelectCase(item.caseCode)}>Lật ngay</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
