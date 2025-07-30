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
            user_team_name: ticketInfo.user_team_name || "",
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
      <nav className="flex justify-center items-center mt-3">
        <ul className="pagination flex gap-2">
          <li
            className={`page-item ${
              currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <button
              className="page-link px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => handlePageClick(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Prev
            </button>
          </li>
          <li className="page-item">
            <span className="page-link px-4 py-2 bg-gray-200 rounded-lg w-24 text-center">
              Page {currentPage} of {totalPages}
            </span>
          </li>
          <li
            className={`page-item ${
              currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <button
              className="page-link px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => handlePageClick(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
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
          <div className="text-center my-2">
            <span className="bg-[#f0f2f5] text-gray-600 text-xs px-3 py-1 rounded-full">
              {dateLabel}
            </span>
          </div>
        )}
        <div
          key={index}
          className={`flex ${
            isSent ? "justify-end" : "justify-start"
          } mb-3 px-2`}
        >
          <div
            className={`relative max-w-[70%] p-2.5 rounded-lg shadow-sm ${
              isSent
                ? "bg-[#d9fdd3] rounded-br-none"
                : "bg-white rounded-bl-none"
            }`}
            style={{
              borderRadius: "8px",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            }}
          >
            {msg.type === "media" &&
            ["jpg", "jpeg", "png", "gif", "webp"].includes(extension) ? (
              <>
                <img
                  src={fileUrl}
                  alt="Media"
                  className="max-w-[250px] rounded-lg cursor-pointer"
                  onClick={() => window.open(fileUrl)}
                  onError={() => setError("Failed to load image")}
                />
                <span className="text-gray-500 text-xs mt-1 block text-right">
                  {messageTime}
                </span>
              </>
            ) : msg.type === "media" &&
              ["mp4", "webm", "ogg"].includes(extension) ? (
              <>
                <video
                  src={fileUrl}
                  controls
                  className="max-w-[250px] rounded-lg"
                  onError={() => setError("Failed to load video")}
                />
                <span className="text-gray-500 text-xs mt-1 block text-right">
                  {messageTime}
                </span>
                <a
                  href={`${GLOBLEURLFORS3}helpdesk-audio/${msg.message}`}
                  download={msg.file_name || "video.mp4"}
                  className="block mt-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  Download Video
                </a>
              </>
            ) : msg.type === "audio" ? (
              <>
                <audio
                  src={`${GLOBLEURLFORS3}helpdesk-audio/${msg.message}`}
                  controls
                  className="w-[250px]"
                  onError={() => setError("Failed to load audio")}
                />
                <span className="text-gray-500 text-xs mt-1 block text-right">
                  {messageTime}
                </span>
              </>
            ) : (
              <>
                <p
                  className="text-gray-800 break-words text-sm"
                  dangerouslySetInnerHTML={{
                    __html: msg.message?.replace(/\n/g, "<br>") || "",
                  }}
                />
                <span className="text-gray-500 text-xs mt-1 block text-right">
                  {messageTime}
                </span>
              </>
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
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mx-4 mt-2"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 right-0 px-4 py-3"
            >
              <span className="text-red-700">×</span>
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden p-4">
          <div className="flex flex-col h-full">
            <div className="flex gap-2 mb-4">
              {["open", "in_progress", "closed"].map((status) => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    status === "open"
                      ? "bg-blue-500 hover:bg-blue-600"
                      : status === "in_progress"
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-green-500 hover:bg-green-600"
                  } text-white ${
                    currentStatus === status
                      ? "ring-2 ring-offset-2 ring-opacity-50" +
                        (status === "open"
                          ? " ring-blue-300"
                          : status === "in_progress"
                          ? " ring-yellow-300"
                          : " ring-green-300")
                      : "opacity-90 hover:opacity-100"
                  }`}
                  onClick={() => {
                    setCurrentStatus(status);
                    fetchTickets(status, 1);
                    closeChatAndReturn();
                    setSearchQuery("");
                  }}
                >
                  {status.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-1 overflow-hidden rounded-xl shadow-lg bg-white">
              <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-3 bg-[#0F2A1D] border-b border-gray-200">
                  <h3 className="p-3 text-lg font-semibold text-white">
                    Ticket List
                  </h3>
                  <div className="relative mx-3 mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search by name or date..."
                      className="w-full p-2 pl-10 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading tickets...</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex-1 overflow-y-auto"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <style>
                      {`
                        .flex-1::-webkit-scrollbar {
                          display: none;
                        }
                      `}
                    </style>
                    {filteredTickets.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No tickets found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`p-4 hover:bg-gray-200 cursor-pointer transition-colors ${
                              currentTicketId === ticket.id ? "bg-blue-100" : ""
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
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {ticket.user_team_name || "Support"}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  {ticket.topic_name}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  ticket.status === "open"
                                    ? "bg-blue-100 text-blue-800"
                                    : ticket.status === "in_progress"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {ticket.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {ticket.update_at
                                ? new Date(ticket.update_at).toLocaleString()
                                : "No date"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tickets.length > 0 && renderPagination()}
              </div>

              {currentTicketId ? (
                <div className="hidden md:flex flex-col w-2/3 bg-[#e5ddd5] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat">
                  <div className="p-3 bg-[#0F2A1D] flex justify-between items-center border-b border-gray-300">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={closeChatAndReturn}
                        className="md:hidden p-2 text-white hover:bg-blue-400 rounded-full transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={() => setShowUserDetails(true)}
                        className="relative group p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 font-semibold">
                          {selectedTicketInfo?.userName?.charAt(0) || "U"}
                        </div>
                      </button>

                      <div className="text-white">
                        <h3 className="font-medium text-lg leading-tight">
                          {selectedTicketInfo?.userName || "User"}
                        </h3>
                        <p className="text-xs text-blue-100 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          {selectedTicketInfo?.topic || "No topic"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={closeTicket}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <span>Close Ticket</span>
                      </button>

                      <button
                        onClick={closeChatAndReturn}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    {showUserDetails && (
                      <>
                        <div
                          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/10"
                          style={{ top: "72px" }}
                          onClick={() => setShowUserDetails(false)}
                        />
                        <div
                          className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                            showUserDetails
                              ? "translate-x-0"
                              : "translate-x-full"
                          }`}
                        >
                          <div className="h-full flex flex-col">
                            <div className="p-4 bg-gradient-to-r from-[#0F2A1D] to-[#1a3c2a] border-b border-gray-200 flex justify-between items-center">
                              <h3 className="text-lg font-semibold text-white">
                                User Details
                              </h3>
                              <button
                                className="p-1 text-white hover:bg-white/20 rounded-full transition-colors"
                                onClick={() => setShowUserDetails(false)}
                              >
                                <svg
                                  className="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                              <div className="text-center">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-blue-300 rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold mb-4 shadow-inner">
                                  {selectedTicketInfo?.userName?.charAt(0) ||
                                    "U"}
                                </div>
                                <h4 className="text-xl font-semibold text-gray-800">
                                  {selectedTicketInfo?.userName || "User Name"}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  ID: {selectedTicketInfo?.user_id || "N/A"}
                                </p>
                              </div>
                              <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                  Contact Info
                                </h5>
                                <div className="space-y-3">
                                  <div className="flex items-start">
                                    <svg
                                      className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Email
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {selectedTicketInfo?.user_email ||
                                          "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start">
                                    <svg
                                      className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Phone
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {selectedTicketInfo?.user_phone_no ||
                                          "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                  Other Details
                                </h5>
                                <div className="space-y-3">
                                  <div className="flex items-start">
                                    <svg
                                      className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Team
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {selectedTicketInfo?.user_team_name ||
                                          "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start">
                                    <svg
                                      className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Member Since
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {selectedTicketInfo?.user_created_at
                                          ? new Date(
                                              selectedTicketInfo.user_created_at
                                            ).toLocaleDateString()
                                          : "N/A"}
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

                  <div
                    className="flex-1 overflow-y-auto p-4 bg-[#e5ddd5] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat"
                    style={{
                      backgroundSize: "250px",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <style>
                      {`
                        .flex-1::-webkit-scrollbar {
                          display: none;
                        }
                      `}
                    </style>
                    {chatMessages.length > 0 ? (
                      chatMessages.map(renderMessage)
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 mx-auto mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {(ticketStatus === "open" || isAssignedAgent()) && (
                    <div className="p-3 bg-[#f0f2f5] flex items-center">
                      <label className="p-2 text-gray-600 hover:text-gray-800 cursor-pointer rounded-full hover:bg-gray-300">
                        {/* <input
                          type="file"
                          id="imageInput"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          onClick={handleUploadPrompt}
                        /> */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          onClick={handleUploadPrompt}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </label>

                      <button
                        onClick={handleRecording}
                        className={`p-2 mx-1 rounded-full ${
                          isRecording
                            ? "bg-red-600 text-white animate-pulse"
                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-300"
                        }`}
                      >
                        {isRecording ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 mx-2">
                        <textarea
                          ref={messageInputRef}
                          value={message}
                          onChange={(e) => {
                            setMessage(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="w-full min-h-[40px] max-h-[120px] p-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                          rows="1"
                        />
                      </div>

                      <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`p-2 rounded-full ${
                          message.trim()
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 rotate-90"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center w-2/3 bg-[#e5ddd5] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat">
                  <div className="text-center p-6 max-w-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-700 mt-4">
                      No Ticket Selected
                    </h3>
                    <p className="text-gray-600 mt-2">
                      Select a ticket from the list to view the chat
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
