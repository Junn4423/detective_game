import type { CasePhase } from '@/types/game'

interface StatusBannerProps {
  phase: CasePhase
  error?: string
  isLoading: boolean
  onReset: () => void
}

const phaseLabel: Record<CasePhase, string> = {
  idle: 'Đang khởi tạo hồ sơ',
  loading: 'Thu thập dữ liệu và dựng vụ án',
  investigating: 'Điều tra và phân tích manh mối',
  accusing: 'Đưa ra cáo buộc cuối cùng',
  solved: 'Vụ án đã được phá',
}

export const StatusBanner = ({ phase, error, isLoading, onReset }: StatusBannerProps) => (
  <section className={`status-banner ${error ? 'status-error' : isLoading ? 'status-loading' : ''}`}>
    <div>
      <p className="status-label">{phaseLabel[phase]}</p>
      {error ? (
        <div className="status-message">
          <p>{error}</p>
          {error.includes('Gemini') ? (
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#94a3b8' }}>
            </small>
          ) : null}
        </div>
      ) : null}
      {!error && isLoading ? <p className="status-message">Đang xử lý API RandomUser + Gemini...</p> : null}
    </div>
    <div className="status-actions">
      <button onClick={onReset} disabled={isLoading} className="reset-btn">
        Lập lại hồ sơ vụ án
      </button>
    </div>
  </section>
)
