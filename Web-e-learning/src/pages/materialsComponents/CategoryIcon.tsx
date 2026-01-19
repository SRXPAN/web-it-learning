import { Code2, Sigma, Database as DatabaseIcon, Network, Globe, Smartphone, Brain, Shield, Container, Monitor } from 'lucide-react'
import type { Category } from '@elearn/shared'

export const CategoryIcon = ({ category }: { category: Category }) => {
  const icons: Record<Category, JSX.Element> = {
    Programming: <Code2 size={18} />,
    Mathematics: <Sigma size={18} />,
    Databases: <DatabaseIcon size={18} />,
    Networks: <Network size={18} />,
    WebDevelopment: <Globe size={18} />,
    MobileDevelopment: <Smartphone size={18} />,
    MachineLearning: <Brain size={18} />,
    Security: <Shield size={18} />,
    DevOps: <Container size={18} />,
    OperatingSystems: <Monitor size={18} />,
  }
  return icons[category] || <Code2 size={18} />
}