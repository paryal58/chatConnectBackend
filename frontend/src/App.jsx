import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [activeChat, setActiveChat] = useState("group"); 
  const [onlineUsers, setOnlineUsers] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => console.log("Connected:", socket.id));

    socket.on("joinSuccess", () => {
      setIsJoined(true);
    });

    socket.on("receiveMessage", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("receivePrivateMessage", (data) => {
      setPrivateChats((prev) => {
        const user = data.user;
        return {
          ...prev,
          [user]: [...(prev[user] || []), data],
        };
      });
    });

    socket.on("onlineUsers", (users) => setOnlineUsers(users));

    socket.on("userJoined", (data) => {
      setChat((prev) => [
        ...prev,
        { type: "notification", text: `${data.user} joined the chat` },
      ]);
    });

    socket.on("userLeft", (data) => {
      setChat((prev) => [
        ...prev,
        { type: "notification", text: `${data.user} left the chat` },
      ]);
    });

    return () => {
      socket.off("connect");
      socket.off("joinSuccess");
      socket.off("receiveMessage");
      socket.off("receivePrivateMessage");
      socket.off("onlineUsers");
      socket.off("userJoined");
      socket.off("userLeft");
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, privateChats, activeChat]);

  const joinChat = () => {
    if (username.trim().length < 3) return;
    socket.emit("join", username.trim());
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const data = {
      user: username,
      text: message.trim(),
      timestamp: new Date().toISOString(),
    };

    if (activeChat === "group") {
      socket.emit("sendMessage", data);
    } else {
      socket.emit("privateMessage", { to: activeChat, data });
      // private chat
      setPrivateChats((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), data],
      }));
    }

    setMessage("");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isJoined) {
    return (
      <div className="join-container">
        <div className="join-card">
          <h1>chatConnect</h1>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="username-input"
          />
          <button onClick={joinChat} className="join-btn">
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  const activeMessages =
    activeChat === "group" ? chat : privateChats[activeChat] || [];

  return (
    <div className="chat-layout">

      <aside className="sidebar">
        <div className="sidebar-header">Online Users</div>
        <ul className="users-list">
          <li
            className={`user-item ${activeChat === "group" ? "active" : ""}`}
            onClick={() => setActiveChat("group")}
          >
            <div className="user-avatar">🌐</div>
            <span>Group Chat</span>
          </li>
          {onlineUsers.map((user) => (
            <li
              key={user}
              className={`user-item ${
                activeChat === user ? "active" : ""
              } ${user === username ? "current-user" : ""}`}
              onClick={() => user !== username && setActiveChat(user)}
            >
              <div className="user-avatar">{user.charAt(0).toUpperCase()}</div>
              <span>{user}</span>
              {user === username && <span style={{ marginLeft: "4px" }}>(You)</span>}
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-window">
        <header className="chat-header">
          {activeChat === "group" ? "Group Chat" : `Chat with ${activeChat}`}
        </header>

        <div className="messages">
          {activeMessages.map((msg, i) =>
            msg.type === "notification" ? (
              <div key={i} className="notification">
                {msg.text}
              </div>
            ) : (
              <div
                key={i}
                className={`message ${
                  msg.user === username ? "own-message" : "other-message"
                }`}
              >
                <div className="message-avatar">
                  {msg.user.charAt(0).toUpperCase()}
                </div>
                <div className="message-content">
                  <span className="message-user">{msg.user}</span>
                  <div className="message-bubble">
                    {msg.text}
                    <div className="message-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="input-container">
          <div className="input-box">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="message-input"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} className="send-btn">
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
