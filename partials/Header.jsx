import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { StoreContext } from "../context/storeContext";

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { getCookie, setCookie, deleteCookie } = useContext(StoreContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  const trigger = useRef(null);
  const dropdown = useRef(null);
  const notificationsTrigger = useRef(null);
  const notificationsDropdown = useRef(null);

  useEffect(() => {
    // Load user data from cookie
    const userDataCookie = getCookie("userData");
    if (userDataCookie) {
      try {
        const parsedUserData = JSON.parse(userDataCookie);
        setUserData(parsedUserData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [getCookie]);

  // Close dropdowns on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!notificationsDropdown.current) return;
      if (!notificationsOpen || notificationsDropdown.current.contains(target) || notificationsTrigger.current.contains(target)) return;
      setNotificationsOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // Close dropdowns if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen && !notificationsOpen) return;
      if (keyCode === 27) {
        setDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  const handleLogout = () => {
    // Clear cookies
    deleteCookie("isLoggedIn");
    deleteCookie("userToken");
    deleteCookie("userData");
    
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const mockNotifications = [
    {
      id: 1,
      type: "info",
      title: "New user registered",
      message: "John Doe has joined the platform",
      time: "2 minutes ago",
      read: false,
    },
    {
      id: 2,
      type: "success",
      title: "Contest completed",
      message: "Weekly Tournament has ended successfully",
      time: "1 hour ago",
      read: false,
    },
    {
      id: 3,
      type: "warning",
      title: "System maintenance",
      message: "Scheduled maintenance in 2 hours",
      time: "3 hours ago",
      read: true,
    },
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 -mb-px">
          {/* Header: Left side */}
          <div className="flex">
            {/* Hamburger button */}
            <button
              className="text-slate-500 hover:text-slate-600 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="w-6 h-6 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="hidden md:block">
              <form className="flex items-center">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-slate-100 border-0 rounded-md pl-10 pr-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors w-64"
                  />
                </div>
              </form>
            </div>

            {/* Notifications */}
            <div className="relative inline-flex">
              <button
                ref={notificationsTrigger}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition duration-150 rounded-full"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-haspopup="true"
                aria-expanded={notificationsOpen}
              >
                <span className="sr-only">Notifications</span>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className="fill-current text-slate-500"
                    d="M6.5 0C2.91 0 0 2.462 0 5.5c0 1.075.37 2.074 1 2.922V12l2.699-1.542A7.454 7.454 0 006.5 11c3.59 0 6.5-2.462 6.5-5.5S10.09 0 6.5 0z"
                  />
                  <path
                    className="fill-current text-slate-400"
                    d="M16 9.5c0-.987-.429-1.897-1.147-2.639C14.124 10.348 10.66 13 6.5 13c-.103 0-.202-.018-.305-.021C7.231 13.617 8.556 14 10 14c.449 0 .886-.04 1.307-.11L15 16v-4h-.012C15.627 11.285 16 10.425 16 9.5z"
                  />
                </svg>
                {unreadCount > 0 && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>
                )}
              </button>

              {/* Notifications Dropdown */}
              <div
                ref={notificationsDropdown}
                className={`origin-top-right z-10 absolute top-full right-0 min-w-80 bg-white border border-slate-200 py-1.5 rounded shadow-lg overflow-hidden mt-1 ${
                  notificationsOpen ? "" : "hidden"
                }`}
              >
                <div className="text-xs font-semibold text-slate-400 uppercase pt-1.5 pb-2 px-4">
                  Notifications
                </div>
                <ul>
                  {mockNotifications.map((notification) => (
                    <li key={notification.id} className={`border-b border-slate-200 last:border-0 ${!notification.read ? 'bg-blue-50' : ''}`}>
                      <div className="block py-2 px-4 hover:bg-slate-50">
                        <div className="flex items-start">
                          <div className={`w-2 h-2 rounded-full mt-2 mr-3 shrink-0 ${
                            notification.type === 'info' ? 'bg-blue-500' :
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}></div>
                          <div className="grow">
                            <div className="text-sm font-medium text-slate-800 mb-1">
                              {notification.title}
                            </div>
                            <div className="text-sm text-slate-600 mb-1">
                              {notification.message}
                            </div>
                            <div className="text-xs text-slate-400">
                              {notification.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="text-center py-2 border-t border-slate-200">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="w-px h-6 bg-slate-200 border-none" />

            {/* User button */}
            <div className="relative inline-flex">
              <button
                ref={trigger}
                className="inline-flex justify-center items-center group"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <img
                  className="w-8 h-8 rounded-full"
                  src={userData?.avatar || "https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff"}
                  width="32"
                  height="32"
                  alt="User"
                />
                <div className="flex items-center truncate">
                  <span className="truncate ml-2 text-sm font-medium text-slate-600 group-hover:text-slate-800">
                    {userData?.name || "Admin User"}
                  </span>
                  <svg
                    className="w-3 h-3 shrink-0 ml-1 fill-current text-slate-400"
                    viewBox="0 0 12 12"
                  >
                    <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                  </svg>
                </div>
              </button>

              {/* User Dropdown */}
              <div
                ref={dropdown}
                className={`origin-top-right z-10 absolute top-full right-0 min-w-44 bg-white border border-slate-200 py-1.5 rounded shadow-lg overflow-hidden mt-1 ${
                  dropdownOpen ? "" : "hidden"
                }`}
              >
                <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-slate-200">
                  <div className="font-medium text-slate-800">{userData?.name || "Admin User"}</div>
                  <div className="text-xs text-slate-500 italic">{userData?.role || "Administrator"}</div>
                </div>
                <ul>
                  <li>
                    <button
                      className="font-medium text-sm text-slate-600 hover:text-slate-800 flex items-center py-1 px-3 w-full text-left"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/settings');
                      }}
                    >
                      Settings
                    </button>
                  </li>
                  <li>
                    <button
                      className="font-medium text-sm text-slate-600 hover:text-slate-800 flex items-center py-1 px-3 w-full text-left"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/profile');
                      }}
                    >
                      Profile
                    </button>
                  </li>
                  <li>
                    <button
                      className="font-medium text-sm text-red-500 hover:text-red-600 flex items-center py-1 px-3 w-full text-left"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;