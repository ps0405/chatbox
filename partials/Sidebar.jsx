import React, { useState, useEffect, useRef, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { StoreContext } from "../context/storeContext";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { pathname } = location;
  const trigger = useRef(null);
  const sidebar = useRef(null);
  const { getCookie } = useContext(StoreContext);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true"
  );

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  const menuItems = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname === "/dashboard" ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z"
          />
          <path
            className={`fill-current ${
              pathname === "/dashboard" ? "text-indigo-600" : "text-slate-600"
            }`}
            d="M12 3c-4.963 0-9 4.037-9 9s4.037 9 9 9 9-4.037 9-9-4.037-9-9-9z"
          />
          <path
            className={`fill-current ${
              pathname === "/dashboard" ? "text-indigo-200" : "text-slate-400"
            }`}
            d="M12 15c-1.654 0-3-1.346-3-3 0-.462.113-.894.3-1.285L6 6l4.714 3.301A2.973 2.973 0 0112 9c1.654 0 3 1.346 3 3s-1.346 3-3 3z"
          />
        </svg>
      ),
    },
    {
      title: "Games",
      path: "/games",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/games") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M13 15l11-7L11.504.136a1 1 0 00-1.019.007L0 7l13 8z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/games") ? "text-indigo-600" : "text-slate-600"
            }`}
            d="M13 15L0 7v9c0 .355.189.685.496.864L13 24v-9z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/games") ? "text-indigo-200" : "text-slate-400"
            }`}
            d="M13 15.047V24l10.573-7.181A.999.999 0 0024 16V8l-11 7.047z"
          />
        </svg>
      ),
    },
    {
      title: "Contests",
      path: "/contests",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/contests") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M1 3h22l-1 7H2L1 3z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/contests") ? "text-indigo-600" : "text-slate-600"
            }`}
            d="M2 10h20l-2 11H4L2 10z"
          />
        </svg>
      ),
    },
    {
      title: "Banners",
      path: "/banners",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/banners") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M20 7a.75.75 0 01-.22-.03l-5.76-1.92a.75.75 0 01-.02-1.42l5.76-1.92c.22-.07.46-.02.64.14.18.16.28.4.28.65v4.5c0 .41-.34.75-.75.75h.07z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/banners") ? "text-indigo-600" : "text-slate-600"
            }`}
            d="M12.5 3.5a.75.75 0 00-1 0L8 7 4.5 3.5a.75.75 0 00-1 0L.22 7.22a.75.75 0 000 1.06L4 12l-3.78 3.72a.75.75 0 000 1.06L3.5 20.5a.75.75 0 001 0L8 17l3.5 3.5a.75.75 0 001 0l3.28-3.28a.75.75 0 000-1.06L12 12l3.78-3.72a.75.75 0 000-1.06L12.5 3.5z"
          />
        </svg>
      ),
    },
    {
      title: "Users",
      path: "/users",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/users") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M18.974 8H22a2 2 0 012 2v6h-2v5a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5h-2v-6a2 2 0 012-2h.974zM20 7a2 2 0 11-4 0 2 2 0 014 0zM2.974 8H6a2 2 0 012 2v6H6v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5H0v-6a2 2 0 012-2h.974zM4 7a2 2 0 11-4 0 2 2 0 014 0zM11 10a2 2 0 012 2v6h-2v5a1 1 0 01-1 1H8a1 1 0 01-1-1v-5H5v-6a2 2 0 012-2h4zM9 9a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: "Reports",
      path: "/reports",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/reports") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M5 7h4v6H5V7zm6 0h4v12h-4V7zm6-5h4v18h-4V2z"
          />
        </svg>
      ),
    },
    {
      title: "Settings",
      path: "/settings",
      icon: (
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current ${
              pathname.includes("/settings") ? "text-indigo-500" : "text-slate-400"
            }`}
            d="M19.714 14.7l-7.007 7.007-1.414-1.414 7.007-7.007c-.195-.4-.298-.84-.3-1.286a3 3 0 113 3 2.969 2.969 0 01-1.286-.3z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/settings") ? "text-indigo-600" : "text-slate-600"
            }`}
            d="M10.714 18.3c.4-.195.84-.298 1.286-.3a3 3 0 11-3 3c.002-.446.105-.886.3-1.286l-6.007-6.007 1.414-1.414 6.007 6.007z"
          />
          <path
            className={`fill-current ${
              pathname.includes("/settings") ? "text-indigo-200" : "text-slate-400"
            }`}
            d="M5.7 10.714c.195.4.298.84.3 1.286a3 3 0 11-3-3c.446.002.886.105 1.286.3l7.007-7.007 1.414 1.414L5.7 10.714z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-slate-900 bg-opacity-30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-screen overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:!w-64 shrink-0 bg-slate-800 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button
            ref={trigger}
            className="lg:hidden text-slate-500 hover:text-slate-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <NavLink end to="/dashboard" className="block">
            <div className="flex items-center">
              <svg className="w-8 h-8" viewBox="0 0 32 32">
                <defs>
                  <linearGradient
                    id="logo-a"
                    x1="28"
                    x2="4"
                    y1="28"
                    y2="4"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#6366F1" />
                    <stop offset="1" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <rect width="28" height="28" x="2" y="2" fill="url(#logo-a)" rx="6" />
                <text
                  x="16"
                  y="20"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="white"
                >
                  GP
                </text>
              </svg>
              <span className="text-white text-xl font-bold ml-3 lg:sidebar-expanded:block 2xl:block hidden">
                GamePlatform
              </span>
            </div>
          </NavLink>
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-slate-500 font-semibold pl-3 lg:sidebar-expanded:block 2xl:block hidden">
              <span
                className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6"
                aria-hidden="true"
              >
                •••
              </span>
              <span className="lg:sidebar-expanded:block 2xl:block hidden">Pages</span>
            </h3>
            <ul className="mt-3">
              {menuItems.map((item, index) => (
                <li
                  key={index}
                  className={`px-3 py-2 rounded-sm mb-0.5 last:mb-0 ${
                    pathname === item.path || pathname.includes(item.path)
                      ? "bg-slate-900"
                      : ""
                  }`}
                >
                  <NavLink
                    end
                    to={item.path}
                    className={`block text-slate-200 truncate transition duration-150 ${
                      pathname === item.path || pathname.includes(item.path)
                        ? "hover:text-slate-200"
                        : "hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span className="text-sm font-medium ml-3 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                        {item.title}
                      </span>
                    </div>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="px-3 py-2">
            <button onClick={() => setSidebarExpanded(!sidebarExpanded)}>
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg
                className="w-6 h-6 fill-current sidebar-expanded:rotate-180"
                viewBox="0 0 24 24"
              >
                <path
                  className="text-slate-400"
                  d="M19.586 11l-5-5L16 4.586 23.414 12 16 19.414 14.586 18l5-5H7v-2z"
                />
                <path className="text-slate-600" d="M3 23H1V1h2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;