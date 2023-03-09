import { useContext, useEffect, useRef, useState } from "react"
import Logo from "./Logo"
import { UserContext } from "./UserContext"
import {uniqBy} from 'lodash'
import axios from 'axios'
import Contact from "./Contact"


export default function Chat() {

    const [ws, setWs] = useState(null)
    const [onlinePeople, setOnlinePeople] = useState({})
    const [offlinePeople, setOfflinePeople] = useState({})
    const [selectedUserId, setSelectedUserId] = useState(null)
    const [newMessageText, setNewMessageText] = useState("")
    const [messages, setMessages] = useState([])

    const divUnderMessages = useRef()

    const {id, loggedInUsername, setId, setLoggedInUsername} = useContext(UserContext)
    useEffect(() => {
      connectToWebsocket();
    }, [])
    
    // For re-connecting if connection is lost
    function connectToWebsocket() {
      const ws = new WebSocket('ws://localhost:4000')
      setWs(ws)
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('close', () => {
        setTimeout(() => {
          console.log("connection lost, reconnecting...");
          connectToWebsocket();
        }, 1000);
      });
    }

    function showOnlinePeople(peopleArray) {
        const people = {}
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username
        });
        setOnlinePeople(people)
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data)
        console.log({ev, messageData});
        if ('online' in messageData) {
            showOnlinePeople(messageData.online)
        } else {
          if (messageData.sender === selectedUserId) {
          setMessages(prev => ([...prev, {...messageData}]));
          }
        }
    }

    function sendMessage(ev) {
      ev.preventDefault()
      ws.send(JSON.stringify({
          recipient: selectedUserId,
          text: newMessageText,
        }
      ));
      setNewMessageText("")
      setMessages(prev => ([...prev,{
        text:newMessageText,
         sender: id,
         recipient: selectedUserId,
         _id: Date.now(),
        }]))

    }
    
    function Logout() {
      axios.post('/logout').then(() => {
        setId(null);
        setLoggedInUsername(null);
        setWs(null);
      })
    }

    useEffect(() => {
      const div = divUnderMessages.current;
      if (div) {
      div.scrollIntoView({behavior:'smooth', block:'end'});
      }
    }, [messages]);

    useEffect(() => {
      axios.get('/people').then(res => {
      const offlinePeopleArr = res.data
      .filter(p => p._id !== id)
      .filter(p => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {}
      offlinePeopleArr.forEach(p => {
        offlinePeople[p._id] = p;
      })
      setOfflinePeople(offlinePeople);
      })
    }, [onlinePeople])

    useEffect(() => {
      if(selectedUserId) {
        axios.get('/messages/'+selectedUserId).then(res => {
          setMessages(res.data);
        })
      }
    }, [selectedUserId])

    const onlinePeopleExclOurUser = {...onlinePeople}
    delete onlinePeopleExclOurUser[id]

    const messageWithoutDupes = uniqBy(messages, '_id');



    
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/4 flex flex-col">
       <div className="flex-grow">
       <Logo />
        
        {Object.keys(onlinePeopleExclOurUser).map(userId => (
        <Contact 
        key={userId}
        online={true}
        id={userId}
        username={onlinePeopleExclOurUser[userId]}
        onClick={() => setSelectedUserId(userId)}
        selected={userId === selectedUserId} />
        ))}

        {Object.keys(offlinePeople).map(userId => (
        <Contact 
        key={userId}
        online={false}
        id={userId}
        username={offlinePeople[userId].username}
        onClick={() => setSelectedUserId(userId)}
        selected={userId === selectedUserId} />
        ))}
       </div>
         <div className="p-6 text-center flex items-center justify-center">
          <span className="mr-2 text-md font-bold text-gray-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
              {loggedInUsername}
          </span>
          <button onClick={Logout} className="text-sm text-white bg-blue-500 py-1 px-2 rounded-md">Logout</button>
          </div>
        </div>
      <div className="bg-blue-50 flex flex-col w-3/4 p-5">
        <div className="flex-grow">
            {!selectedUserId && (
              <div className="flex items-center h-full justify-center">
                <div className="text-gray-400 font-semibold">&larr; Choose a user from the list</div>
              </div>
            )}

            {!!selectedUserId && (
              <div className="relative h-full">
              <div className="overflow-y-scroll absolute inset-0">
                {messageWithoutDupes.map(message => (
                  <div key={message._id} className={(message.sender === id ? "text-right" : 'text-left')}>
                  <div className={"p-2 my-2 text-sm rounded-md inline-block text-left " +(message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                    {message.text}
                    </div>
                    </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
              </div>
            )}
            </div>
            {!!selectedUserId && (
        <form onSubmit={sendMessage} className="flex gap-2">
            <input value={newMessageText}
             onChange={(e) => setNewMessageText(e.target.value)}
             type="text"
             className="bg-white border p-2 flex-grow rounded-sm"
             placeholder="type message here" />
            <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            </button>
        </form>
            )}
      </div>
    </div>
  )
}


