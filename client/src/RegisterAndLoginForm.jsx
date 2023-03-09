import { useContext, useState } from "react"
import axios from 'axios'
import { UserContext } from "./UserContext"


export default function RegisterAndLoginForm() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register')

   const {setLoggedInUsername, setId} = useContext(UserContext)

   async function handleSubmit(e) {
      e.preventDefault()
      const url = isLoginOrRegister === 'register' ? 'register' : 'login'
    await axios.post(url, {username, password})
    setLoggedInUsername(username)
    setId(data.id)
    }

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input type="text" placeholder="User name" className="block w-full rounded-sm p-2 mb-2 border" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" className="block w-full rounded-sm p-2 mb-2 border" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2">{isLoginOrRegister === 'register' ? 'Register' : 'Login'}</button>
        <div className="text-center mt-2">
          {isLoginOrRegister === 'register' && (
            <div>
              Already a user?<button className="ml-2 font-semibold" onClick={() => setIsLoginOrRegister('login')}>Login</button>
            </div>
          )}

          {isLoginOrRegister === 'login' && (
            <div>
              Don't have an account?<button className="ml-2 font-semibold" onClick={() => setIsLoginOrRegister('register')}>Register</button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
