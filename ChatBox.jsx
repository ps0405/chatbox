import React, { useState, useEffect, useContext, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import {
  initiateSocket,
  getSocket,
  disconnectSocket,
} from "../components/socket";
import {
  format,
  isSameDay,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import "../css/style.css";
import { toast } from "react-toastify";

const ChatBox = () => {
  const navigate = useNavigate();
  const { user, baseUrl, socketUrl, getCookie, GLOBLEURLFORS3 } =
    useContext(StoreContext);
  const location = useLocation();
  const { ticketInfo } = location.state || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStatus, setCurrentStatus] = useState(
    ticketInfo?.status || "open"
  );
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [language, setLanguage] = useState("english");
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTicketInfo, setSelectedTicketInfo] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const messageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const limit = 10;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const { ticketId, user_id, ticketInfo } = location.state || {};
    if (ticketId && user_id && ticketInfo) {
      openTicketChat({
        id: ticketId,
        user_id,
        status: ticketInfo.status || "open",
        language: ticketInfo.language || "english",
        ticketInfo: {
          user_id: ticketInfo.user_id || user_id,
          user_name: ticketInfo.user_name || "Unknown",
          user_team_name: ticketInfo.user_team_name || "Support",
          status: ticketInfo.status || "open",
          language: ticketInfo.language || "english",
          topic_name: ticketInfo.topic_name || "Profile",
          update_at: ticketInfo.update_at || new Date().toISOString(),
        },
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (ticketInfo?.status) {
      setCurrentStatus(ticketInfo.status);
    }
  }, [ticketInfo?.status]);

  useEffect(() => {
    const isLogin = getCookie("isLoggedIn");
    if (!isLogin || isLogin === "false") {
      console.log("Session expired.");
      toast.error("Session expired. Please log in again.");
      setInterval(() => {
        navigate("/login");
      }, 1500);
    }
  }, []);

  useEffect(() => {
    // const token = getCookie("token_no");
    // if (!token) {
    //   setError("Authentication token not found. Please log in.");
    //   return;
    // }

    initiateSocket(socketUrl);

    const socket = getSocket();
    if (!socket) {
      setError("Failed to initialize socket connection");
      return;
    }

    socket.on("connect", () => {
      const agentId = getCookie("id");
      if (agentId) {
        socket.emit("register", agentId);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setError(`Failed to connect to chat server: ${err.message}`);
    });
    const currentUser = getCookie("id");
    socket.on("res", (data) => {
      if (!data?.en || !data?.data) {
        console.warn("Invalid socket response:", data);
        setError("Received invalid response from server");
        return;
      }
      switch (data.en) {
        case "sendAgentMessage":
        case "addMessage":
          if (!data.data.message && !data.data.file) return;

          const newMsg = {
            ...data.data,
            type: data.data.type || "text",
            sender_id: data.data.sender_id,
          };

          setChatMessages((prev) => [...prev, newMsg]);
          
          if (
            currentTicketIdRef.current == newMsg.ticket_id &&
            newMsg.receiver_id == currentUser
          ) {
            console.log("i am if")
            socket.emit("req", {
              en: "messageRead",
              data: {
                ticket_id: newMsg.ticket_id,
                reader_id: currentUser,
              },
            });
          }
          break;
        case "getChat":
          setLanguage(data.ticketData?.language || "english");
          setChatMessages(data.data || []);
          setTicketStatus(data.ticketData?.status || "open");

          const ticketInfo = data.ticketInfo || {};
          const ticketData = data.ticketData || {};

          setSelectedTicketInfo({
            user_id: ticketInfo.user_id || "Unknown",
            display_name: ticketInfo.display_name || "Unknown",
            user_email: ticketInfo.user_email || "",
            user_created_at: ticketInfo.user_created_at || "",
            user_phone_no: ticketInfo.user_phone_no || "",
            user_team_name: ticketInfo.user_team_name || "Support",
            userName: ticketData.userName || "Unknown",
            topic: ticketData.topic_name || "Profile",
            updateAt:
              ticketData.update_at &&
              !isNaN(new Date(ticketData.update_at).getTime())
                ? ticketData.update_at
                : new Date().toISOString(),
            agent_id: ticketData.agent_id || null,
          });
          // ✅ Emit messageRead after loading the chat
          if (ticketData.id && currentUser) {
            socket.emit("req", {
              en: "messageRead",
              data: {
                ticket_id: ticketData.id,
                reader_id: currentUser,
              },
            });
          }
          break;
        case "closeTicket":
          setChatMessages((prev) => [...prev, ...(data.data || [])]);
          fetchTickets(currentStatus, currentPage);
          break;
        case "messageRead":
          // Optional: update UI if you track read receipts
          console.log("Message marked as read", data.data);
          break;
        default:
          console.warn("Unhandled socket event:", data.en);
      }
    });

    socket.on("error", (err) => {
      setError(`Socket error: ${err.message || "Unknown error"}`);
    });

    fetchTickets(currentStatus, 1);

    return () => {
      disconnectSocket();
    };
  }, [socketUrl, getCookie, currentStatus, currentPage]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchTickets = async (status, page) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    try {
      const response = await axiosInstance.post(`${baseUrl}getTickets`, {
        status,
        limit,
        offset,
      });
      if (response.data?.data) {
        setTickets(response.data.data);
        setFilteredTickets(response.data.data);
        setCurrentPage(page);
      } else {
        setTickets([]);
        setFilteredTickets([]);
        setError("No tickets found");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError(error.response?.data?.message || "Failed to load tickets");
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = tickets.filter((ticket) => {
      const topicName = ticket.topic_name || "";
      const userTeamName = ticket.user_team_name || "";
      const userName = ticket.user_name || "";
      const ticketId = ticket.id?.toString() || "";
      const formattedDate = ticket.update_at
        ? format(new Date(ticket.update_at), "EEE, MMM d, yyyy, h:mm a")
        : "";

      return (
        topicName.toLowerCase().includes(query) ||
        userTeamName.toLowerCase().includes(query) ||
        userName.toLowerCase().includes(query) ||
        ticketId.includes(query) ||
        formattedDate.toLowerCase().includes(query)
      );
    });
    setFilteredTickets(filtered);
  };

  const currentTicketIdRef = useRef(null);

  const openTicketChat = ({ id, user_id, status, language, ticketInfo }) => {
    // console.log("Opening ticket chat:", {
    //   id,
    //   user_id,
    //   status,
    //   language,
    //   ticketInfo,
    // });
    const socket = getSocket();
    if (!socket) {
      setError("Socket not initialized");
      return;
    }

    const agentId = getCookie("id");
    if (!agentId) {
      setError("Agent ID not found");
      return;
    }

    if (status === "open") {
      const proceed = window.confirm("Do you want to open this chat ticket?");
      if (!proceed) return;
      socket.emit("req", {
        en: "addAgentChat",
        data: { sender_id: agentId, ticket_id: id, user_id, language },
      });
    }

    setCurrentTicketId(id);
    currentTicketIdRef.current = id;
    setLanguage(language || "english");
    setSelectedTicketInfo({
      user_id: ticketInfo.user_id || "Unknown",
      display_name: ticketInfo.user_name || "Unknown",
      user_email: ticketInfo.user_email || "",
      user_created_at: ticketInfo.user_created_at || "",
      user_phone_no: ticketInfo.user_phone_no || "",
      user_team_name: ticketInfo.user_team_name || "Support",
      userName: ticketInfo.user_name || "Unknown",
      topic: ticketInfo.topic_name || "Profile",
      updateAt:
        ticketInfo.update_at && !isNaN(new Date(ticketInfo.update_at).getTime())
          ? ticketInfo.update_at
          : new Date().toISOString(),
      agent_id: ticketInfo.agent_id || null,
    });

    socket.emit("register", agentId);
    socket.emit("joinTicketRoom", id);
    socket.emit("adminOpenChat", id);
    socket.emit("req", {
      en: "getChat",
      data: { ticket_id: id, user_id: agentId },
    });
  };

  const sendMessage = () => {
    if (!message.trim() || !currentTicketId) return;

    const socket = getSocket();
    if (!socket) {
      setError("Socket not initialized");
      return;
    }

    const agentId = getCookie("id");
    const receiverId = chatMessages[0]?.sender_id;
    if (!agentId || !receiverId) {
      setError("Invalid sender or receiver ID");
      return;
    }

    socket.emit("req", {
      en: "sendAgentMessage",
      data: {
        sender_id: agentId,
        receiver_id: receiverId,
        ticket_id: currentTicketId,
        message: message.trim(),
        type: "text",
      },
    });

    setMessage("");
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !currentTicketId) return;

    const socket = getSocket();
    if (!socket) {
      setError("Socket not initialized");
      return;
    }

    const agentId = getCookie("id");
    const receiverId = chatMessages[0]?.sender_id;
    if (!agentId || !receiverId) {
      setError("Invalid sender or receiver ID");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      socket.emit("req", {
        en: "addMessage",
        data: {
          file: e.target.result,
          file_name: file.name,
          sender_id: agentId,
          is_bot: 1,
          receiver_id: receiverId,
          ticket_id: currentTicketId,
          type: "media",
        },
      });
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPrompt = () => {
    const socket = getSocket();
    if (!socket || !currentTicketId) {
      setError("Socket or ticket ID not initialized");
      return;
    }

    const agentId = getCookie("id");
    const ticketId = currentTicketId;
    // const ticketId = urlParams.get("ticket_id");
    const receiverId = chatMessages[0]?.sender_id;
    if (!agentId || !receiverId) {
      setError("Invalid sender or receiver ID");
      return;
    }

    socket.emit("req", {
      en: "sendAgentMessage",
      data: {
        sender_id: user.id,
        receiver_id: chatMessages[0].sender_id,
        ticket_id: ticketId,
        message:
          language === "english"
            ? "Please upload image/video"
            : "कृपया छवि/वीडियो अपलोड करें",
        type: "text",
        upload: "true",
      },
    });
  };

  const handleRecording = async () => {
    if (!currentTicketId) return;

    const socket = getSocket();
    if (!socket) {
      setError("Socket not initialized");
      return;
    }

    const agentId = getCookie("id");
    const receiverId = chatMessages[0]?.sender_id;
    if (!agentId || !receiverId) {
      setError("Invalid sender or receiver ID");
      return;
    }

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          if (audioBlob.size > 5 * 1024 * 1024) {
            setError("Audio file size exceeds 5MB limit");
            return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            socket.emit("req", {
              en: "addMessage",
              data: {
                sender_id: agentId,
                receiver_id: receiverId,
                ticket_id: currentTicketId,
                message: "",
                type: "audio",
                file_name: `${new Date().toISOString()}_audio.webm`,
                file: reader.result,
                language,
                is_bot: 0,
              },
            });
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Audio recording error:", error);
        setError("Failed to access microphone");
      }
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const closeTicket = () => {
    if (!currentTicketId) return;

    const socket = getSocket();
    if (!socket) {
      setError("Socket not initialized");
      return;
    }

    const proceed = window.confirm(
      "Are you sure you want to close this ticket?"
    );
    if (!proceed) return;

    socket.emit("req", {
      en: "closeTicket",
      data: { ticket_id: currentTicketId },
    });
    localStorage.setItem("ticketClosed", "1");
    closeChatAndReturn();
  };

  const closeChatAndReturn = () => {
    const socket = getSocket();
    if (socket && currentTicketId) {
      socket.emit("leaveTicketRoom", currentTicketId);
    }
    setCurrentTicketId(null);
    setChatMessages([]);
    setTicketStatus(null);
    setSelectedTicketInfo(null);
  };

  const handlePageClick = (page) => {
    if (page < 1) return;
    fetchTickets(currentStatus, page);
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(tickets.length / limit);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center py-4 bg-gray-50 border-t">
        <div className="flex items-center space-x-2">
          <button
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border rounded-lg">
            {currentPage} of {totalPages}
          </div>
          
          <button
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderMessage = (msg, index) => {
    const isSent =
      Number(getCookie("id")) === Number(msg.sender_id) ||
      msg.sender_id == null;
    const extension = msg.message?.split(".").pop()?.toLowerCase();
    const fileUrl = `${GLOBLEURLFORS3}helpdesk-images/${msg.message}`;
    const messageTime = new Date(
      msg.timestamp || Date.now()
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const messageDate = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel;
    if (isSameDay(messageDate, today)) {
      dateLabel = "Today";
    } else if (isSameDay(messageDate, yesterday)) {
      dateLabel = "Yesterday";
    } else if (
      isWithinInterval(messageDate, {
        start: startOfWeek(today),
        end: endOfWeek(today),
      })
    ) {
      dateLabel = format(messageDate, "EEEE");
    } else {
      dateLabel = format(messageDate, "dd/MM/yyyy");
    }

    const prevMsg = chatMessages[index - 1];
    const showDateSeparator =
      index === 0 ||
      !prevMsg ||
      !isSameDay(
        new Date(msg.timestamp || Date.now()),
        new Date(prevMsg.timestamp || Date.now())
      );

    return (
      <>
        {showDateSeparator && (
          <div className="flex justify-center my-4">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border">
              <span className="text-gray-600 text-xs font-medium">
                {dateLabel}
              </span>
            </div>
          </div>
        )}
        <div
          key={index}
          className={`flex ${
            isSent ? "justify-end" : "justify-start"
          } mb-2 px-4`}
        >
          <div
            className={`relative max-w-[75%] lg:max-w-[60%] p-3 rounded-2xl shadow-sm ${
              isSent
                ? "bg-[#dcf8c6] rounded-br-md ml-12"
                : "bg-white rounded-bl-md mr-12"
            } transition-all duration-200 hover:shadow-md`}
          >
            {msg.type === "media" &&
            ["jpg", "jpeg", "png", "gif", "webp"].includes(extension) ? (
              <div className="space-y-2">
                <img
                  src={fileUrl}
                  alt="Media"
                  className="max-w-[280px] rounded-xl cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => window.open(fileUrl)}
                  onError={() => setError("Failed to load image")}
                />
                <div className="flex justify-end">
                  <span className="text-gray-500 text-xs">
                    {messageTime}
                  </span>
                </div>
              </div>
            ) : msg.type === "media" &&
              ["mp4", "webm", "ogg"].includes(extension) ? (
              <div className="space-y-2">
                <video
                  src={fileUrl}
                  controls
                  className="max-w-[280px] rounded-xl"
                  onError={() => setError("Failed to load video")}
                />
                <div className="flex items-center justify-between">
                  <a
                    href={`${GLOBLEURLFORS3}helpdesk-audio/${msg.message}`}
                    download={msg.file_name || "video.mp4"}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Download
                  </a>
                  <span className="text-gray-500 text-xs">
                    {messageTime}
                  </span>
                </div>
              </div>
            ) : msg.type === "audio" ? (
              <div className="space-y-2">
                <audio
                  src={`${GLOBLEURLFORS3}helpdesk-audio/${msg.message}`}
                  controls
                  className="w-[280px]"
                  onError={() => setError("Failed to load audio")}
                />
                <div className="flex justify-end">
                  <span className="text-gray-500 text-xs">
                    {messageTime}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p
                  className="text-gray-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.message?.replace(/\n/g, "<br>") || "",
                  }}
                />
                <div className="flex justify-end">
                  <span className="text-gray-500 text-xs">
                    {messageTime}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const isAssignedAgent = () => {
    const agentId = getCookie("id");
    return (
      ticketStatus === "in_progress" &&
      (selectedTicketInfo?.agent_id == agentId ||
        selectedTicketInfo?.user_id == agentId)
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />

        {error && (
          <div className="mx-4 mt-2 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden p-4">
          <div className="flex flex-col h-full">
            {/* Status Filter Buttons */}
            <div className="flex gap-3 mb-6">
              {[
                { key: "open", label: "Open", color: "blue", icon: "📨" },
                { key: "in_progress", label: "In Progress", color: "yellow", icon: "⏳" },
                { key: "closed", label: "Closed", color: "green", icon: "✅" }
              ].map(({ key, label, color, icon }) => (
                <button
                  key={key}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm ${
                    currentStatus === key
                      ? `bg-${color}-500 text-white shadow-lg scale-105`
                      : `bg-white text-gray-700 hover:bg-${color}-50 hover:text-${color}-700 hover:shadow-md`
                  }`}
                  onClick={() => {
                    setCurrentStatus(key);
                    fetchTickets(key, 1);
                    closeChatAndReturn();
                    setSearchQuery("");
                  }}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                  {currentStatus === key && (
                    <div className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Main Chat Container */}
            <div className="flex flex-1 overflow-hidden rounded-2xl shadow-xl bg-white">
              {/* Ticket List Sidebar */}
              <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-white">
                {/* Sidebar Header */}
                <div className="p-6 bg-gradient-to-r from-[#075e54] to-[#128c7e] text-white">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Support Tickets
                  </h3>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search conversations..."
                      className="w-full p-3 pl-12 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all duration-200"
                    />
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Ticket List */}
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-[#075e54] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Loading conversations...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {filteredTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">No conversations found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                              currentTicketId === ticket.id ? "bg-[#f0f9ff] border-r-4 border-[#075e54]" : ""
                            }`}
                            onClick={() =>
                              openTicketChat({
                                id: ticket.id,
                                user_id: ticket.user_id || "",
                                status: ticket.status,
                                language: ticket.language || "english",
                                ticketInfo: ticket,
                              })
                            }
                          >
                            <div className="flex items-start space-x-3">
                              {/* Avatar */}
                              <div className="w-12 h-12 bg-gradient-to-br from-[#075e54] to-[#128c7e] rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                {(ticket.user_team_name || "S").charAt(0)}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {ticket.user_team_name || "Support Team"}
                                  </h4>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      ticket.status === "open"
                                        ? "bg-blue-100 text-blue-700"
                                        : ticket.status === "in_progress"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {ticket.status === "in_progress" ? "Active" : ticket.status}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 truncate mb-2">
                                  {ticket.topic_name || "General Support"}
                                </p>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-400">
                                    #{ticket.id}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {ticket.update_at
                                      ? format(new Date(ticket.update_at), "MMM d, HH:mm")
                                      : "No date"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {tickets.length > 0 && renderPagination()}
              </div>

              {/* Chat Area */}
              {currentTicketId ? (
                <div className="hidden md:flex flex-col w-2/3 bg-gradient-to-b from-[#e5ddd5] to-[#d9d5c8]">
                  {/* Chat Header */}
                  <div className="p-4 bg-gradient-to-r from-[#075e54] to-[#128c7e] flex justify-between items-center shadow-lg">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={closeChatAndReturn}
                        className="md:hidden p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setShowUserDetails(true)}
                        className="relative group p-1 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
                      >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#075e54] font-bold text-lg">
                          {selectedTicketInfo?.userName?.charAt(0) || "U"}
                        </div>
                      </button>

                      <div className="text-white">
                        <h3 className="font-semibold text-lg leading-tight">
                          {selectedTicketInfo?.userName || "User"}
                        </h3>
                        <div className="flex items-center text-sm text-white/80">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          {selectedTicketInfo?.topic || "Support Chat"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={closeTicket}
                        className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Close Ticket
                      </button>

                      <button
                        onClick={closeChatAndReturn}
                        className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* User Details Sidebar */}
                    {showUserDetails && (
                      <>
                        <div
                          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20"
                          style={{ top: "72px" }}
                          onClick={() => setShowUserDetails(false)}
                        />
                        <div
                          className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                            showUserDetails ? "translate-x-0" : "translate-x-full"
                          }`}
                        >
                          <div className="h-full flex flex-col">
                            <div className="p-6 bg-gradient-to-r from-[#075e54] to-[#128c7e] text-white">
                              <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">Contact Info</h3>
                                <button
                                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                                  onClick={() => setShowUserDetails(false)}
                                >
                                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                              {/* Profile Section */}
                              <div className="text-center">
                                <div className="w-28 h-28 mx-auto bg-gradient-to-br from-[#075e54] to-[#128c7e] rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg">
                                  {selectedTicketInfo?.userName?.charAt(0) || "U"}
                                </div>
                                <h4 className="text-2xl font-bold text-gray-800">
                                  {selectedTicketInfo?.userName || "User Name"}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1 bg-gray-100 px-3 py-1 rounded-full inline-block">
                                  ID: {selectedTicketInfo?.user_id || "N/A"}
                                </p>
                              </div>

                              {/* Contact Information */}
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 shadow-sm">
                                <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  Contact Details
                                </h5>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Email</p>
                                      <p className="text-sm text-gray-600">{selectedTicketInfo?.user_email || "Not provided"}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Phone</p>
                                      <p className="text-sm text-gray-600">{selectedTicketInfo?.user_phone_no || "Not provided"}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Info */}
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 shadow-sm">
                                <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Additional Info
                                </h5>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Team</p>
                                      <p className="text-sm text-gray-600">{selectedTicketInfo?.user_team_name || "Not assigned"}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                      <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Member Since</p>
                                      <p className="text-sm text-gray-600">
                                        {selectedTicketInfo?.user_created_at
                                          ? format(new Date(selectedTicketInfo.user_created_at), "MMM d, yyyy")
                                          : "Unknown"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Messages Area */}
                  <div
                    className="flex-1 overflow-y-auto p-4 bg-[#e5ddd5] relative"
                    style={{
                      backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#888 transparent"
                    }}
                  >
                    {chatMessages.length > 0 ? (
                      chatMessages.map(renderMessage)
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-600 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#075e54] to-[#128c7e] rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Start the conversation!</h3>
                          <p className="text-gray-500">Send a message to begin chatting with the user.</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Area */}
                  {(ticketStatus === "open" || isAssignedAgent()) && (
                    <div className="p-4 bg-[#f0f0f0] border-t border-gray-200">
                      <div className="flex items-end space-x-3 bg-white rounded-2xl p-3 shadow-sm">
                        {/* Attachment Button */}
                        <button
                          onClick={handleUploadPrompt}
                          className="p-2 text-gray-500 hover:text-[#075e54] hover:bg-gray-100 rounded-full transition-all duration-200"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>

                        {/* Voice Recording Button */}
                        <button
                          onClick={handleRecording}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            isRecording
                              ? "bg-red-500 text-white animate-pulse shadow-lg"
                              : "text-gray-500 hover:text-[#075e54] hover:bg-gray-100"
                          }`}
                        >
                          {isRecording ? (
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          )}
                        </button>

                        {/* Message Input */}
                        <div className="flex-1">
                          <textarea
                            ref={messageInputRef}
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                            }}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            placeholder="Type a message..."
                            className="w-full min-h-[40px] max-h-[120px] p-2 rounded-xl bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none resize-none"
                            rows="1"
                          />
                        </div>

                        {/* Send Button */}
                        <button
                          onClick={sendMessage}
                          disabled={!message.trim()}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            message.trim()
                              ? "bg-[#075e54] text-white hover:bg-[#128c7e] shadow-lg hover:shadow-xl transform hover:scale-105"
                              : "text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State */
                <div className="hidden md:flex flex-col items-center justify-center w-2/3 bg-gradient-to-b from-[#e5ddd5] to-[#d9d5c8]">
                  <div className="text-center p-8 max-w-md">
                    <div className="w-24 h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg className="h-12 w-12 text-[#075e54]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      Welcome to Support Chat
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Select a conversation from the sidebar to start chatting with users and providing support.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatBox;