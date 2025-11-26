import type { VictimProfile } from '@/types/game'

interface VictimProfileProps {
  victim?: VictimProfile
}

export const VictimProfileCard = ({ victim }: VictimProfileProps) => {
  if (!victim) {
    return (
      <section className="panel">
        <h2>Victim Profile</h2>
        <p>Đang xác thực nạn nhân...</p>
      </section>
    )
  }

  return (
    <section className="panel victim-card">
      <div className="panel-header">
        <h2>Victim Profile</h2>
        <span>{new Date(victim.timeOfIncident).toLocaleString()}</span>
      </div>
      <div className="victim-body">
        <img src={victim.portrait} alt={victim.fullName} />
        <div>
          <h3>{victim.fullName}</h3>
          <p>{victim.age} tuổi · {victim.gender}</p>
          <p>Nghề nghiệp: {victim.occupation}</p>
          <p>Quê quán: {victim.residence}</p>
          <p>Liên hệ: {victim.phone}</p>
        </div>
      </div>
    </section>
  )
}
