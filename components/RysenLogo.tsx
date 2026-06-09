export default function RysenLogo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  const color = light ? 'text-white' : 'text-midnight'
  const goldColor = light ? 'text-gold' : 'text-gold'

  return (
    <div className={`font-bold tracking-widest ${sizes[size]} ${color} select-none`}>
      <span>RYSEN</span>
      <div className={`text-xs font-medium tracking-wider ${goldColor} -mt-1`}>
        {size !== 'sm' && 'LEARNING CENTRE'}
      </div>
    </div>
  )
}
