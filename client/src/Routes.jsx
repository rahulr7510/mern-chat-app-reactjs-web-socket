import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { useContext } from "react";
import { UserContext } from "./UserContext";
import Chat from "./Chat";


export default function Routes() {
  const {loggedInUsername, id} = useContext(UserContext)

  if (loggedInUsername) {
    return (
      <Chat />
    )
  }

  return (
    <RegisterAndLoginForm />
  )
}

