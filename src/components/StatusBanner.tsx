import type { CasePhase } from '@/types/game'

interface StatusBannerProps {
  phase: CasePhase
  error?: string
  isLoading: boolean
}

const phaseLabel: Record<CasePhase, string> = {
  idle: 'Đang khởi tạo hồ sơ',
  loading: 'Thu thập dữ liệu và dựng vụ án',
  investigating: 'Điều tra và phân tích manh mối',
  accusing: 'Đưa ra cáo buộc cuối cùng',
  solved: 'Vụ án đã được phá',
}

export const StatusBanner = ({ phase, error, isLoading }: StatusBannerProps) => (
  <section className={`status-banner ${error ? 'status-error' : isLoading ? 'status-loading' : ''}`}>
    <div>
      <p className="status-label">{phaseLabel[phase]}</p>
      {error ? <p className="status-message">{error}</p> : null}
      {!error && isLoading ? <p className="status-message">Đang xử lý API RandomUser + Gemini...</p> : null}
    </div>
  </section>
)
