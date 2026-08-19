import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import styles from './index.module.less'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <Result
        status="404"
        title="404"
        subTitle="抱歉，你访问的页面不存在。"
        extra={
          <Button type="primary" onClick={() => navigate('/home')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
