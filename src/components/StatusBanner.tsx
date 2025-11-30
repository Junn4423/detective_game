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
  capturing: 'Triển khai vây bắt hung thủ',
  solved: 'Vụ án đã được phá',
  GAME_OVER_MISSING_KILLER: 'Hồ sơ bế tắc',
}

export const StatusBanner = ({ phase, error, isLoading }: StatusBannerProps) => (
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
      {!error && isLoading ? <p className="status-message">Đang xử lý hồ sơ vụ án...</p> : null}
    </div>
  </section>
)
