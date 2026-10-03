import Image from 'next/image'
import logo from '@/public/brands/skillry.png'

export function SkillryLogo({ size = 40 }: { size?: number }) {
  return <Image src={logo} alt="Skillry logo" width={size} height={size} unoptimized className="shrink-0 rounded-[10px]" />
}
