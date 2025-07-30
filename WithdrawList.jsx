import React, { useState, useEffect, useContext } from "react";
import DataTable from "react-data-table-component";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import "../css/withdrawList.css";
import CustomPagination from "../components/CustomPagination";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const WithdrawList = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterId, setFilterId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("DESC");

  useEffect(() => {
    checkRoleAccess(["admin", "accountant"]);
    loadWithdrawHistory(currentStatus, currentPage, sortField, sortDirection);
    fetchSettlementDate();
  }, []);

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

  const checkRoleAccess = (roles) => {
    console.log("Checking role access for:", roles);
  };

  const fetchSettlementDate = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${baseUrl}getSettlementDate`);
      const dateObj = new Date(response.data.data);
      setSettlementDate(
        dateObj.toLocaleString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    } catch (error) {
      console.error("Error fetching settlement date:", error);
      setError("Failed to fetch settlement date");
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawHistory = async (
    status,
    page = 1,
    sortField,
    sortDirection,
    limit = itemsPerPage
  ) => {
    const offset = (page - 1) * limit;

    const response = await axiosInstance.post("/getWithdrawHistory", {
      status,
      offset,
      limit,
      sortField,
      sortDirection,
    });

    const responseData = response.data;

    setTotalItems(responseData.totalItems || 0);
    setData(
      Array.isArray(responseData.data)
        ? responseData.data.map((item) => ({ ...item, selected: false }))
        : []
    );
  };

  const filterWithdrawById = async () => {
    if (!filterId) {
      toast.error("Please enter a valid ID to filter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        `${baseUrl}getWithdrawHistory`,
        {
          status: "Pending",
          max_id: Number(filterId),
          sortField,
          sortDirection,
        }
      );

      const responseData = response.data;
      setData(
        Array.isArray(responseData.data)
          ? responseData.data.map((item) => ({ ...item, selected: false }))
          : []
      );
      setTotalItems(responseData.data.length || 0);
      toast.success("Filter applied successfully!");
    } catch (error) {
      console.error("Error filtering withdraw history:", error);
      setError("No Data Found for this ID.");
      toast.error("No Data Found for this ID.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const updatePendingToSuccess = async () => {
    const selectedRows = data.filter((row) => row.selected);
    const ids = selectedRows.map((row) => row.id);

    if (ids.length === 0) {
      toast.warning("Please select at least one entry to mark as Success.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SelectedData");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "selected_withdrawals.xlsx");

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateWithdrawStatus`,
        {
          status: "Success",
          max_id: Number(filterId) || undefined,
          ids,
        }
      );

      if (response.data.status === 200) {
        toast.success("Selected entries marked as Success successfully!");
        loadWithdrawHistory("Pending", 1, sortField, sortDirection);
      } else {
        toast.error("Failed to update statuses: " + (response.data.message || ""));
      }
    } catch (error) {
      console.error("Error updating statuses:", error);
      toast.error("Something went wrong while updating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSuccessToReject = async (id, reason) => {
    if (!reason) {
      toast.warning("Please select a reject reason before rejecting.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to reject transaction ID ${id} with reason: "${reason}"?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateWithdrawStatusReject`,
        {
          status: "Rejected",
          id,
          reason,
        }
      );

      if (response.data.status === 200) {
        toast.success("Transaction rejected successfully!");
        loadWithdrawHistory("Success", currentPage, sortField, sortDirection);
      } else {
        toast.error("Failed to reject transaction: " + (response.data.message || ""));
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Something went wrong while rejecting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSettlementDate = async () => {
    if (!expectedDate) {
      toast.warning("Please select expected settlement date.");
      return;
    }

    const localDate = new Date(expectedDate);
    if (isNaN(localDate.getTime())) {
      toast.error("Invalid date format.");
      return;
    }

    const utcDate = localDate.toISOString();

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateSettlementDate`,
        {
          expectedDate: utcDate,
        }
      );

      if (response.status === 200) {
        toast.success("Settlement date updated successfully!");
        setExpectedDate("");
        fetchSettlementDate();
      }
    } catch (error) {
      console.error("Error updating settlement date:", error);
      toast.error("Something went wrong while updating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (selected) => {
    setData((prevData) => prevData.map((row) => ({ ...row, selected })));
  };

  useEffect(() => {
    setCurrentPage(1);
    loadWithdrawHistory(currentStatus, 1, sortField, sortDirection);
  }, [currentStatus, sortField, sortDirection]);

  const handleRowSelect = (id) => {
    setData((prevData) =>
      prevData.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const handleReasonChange = (id, reason) => {
    setData((prevData) =>
      prevData.map((row) =>
        row.id === id ? { ...row, reject_reason: reason } : row
      )
    );
  };

  const handleFilterIdInput = (e) => {
    const value = e.target.value;
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setFilterId(value);
    }
  };

  const handleSort = (column, sortDirection) => {
    setSortField(column.selector);
    setSortDirection(sortDirection);
    loadWithdrawHistory(
      currentStatus,
      currentPage,
      column.selector,
      sortDirection,
      itemsPerPage
    );
  };

  const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'Pending':
          return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Success':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Rejected':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  const columns = [
    {
      name: "ID",
      selector: (row) => row.id || "",
      sortable: true,
      center: true,
      width: "80px",
      cell: (row) => (
        <div className="font-mono text-sm font-semibold text-indigo-600">
          #{row.id}
        </div>
      ),
    },
    {
      name: "Transaction ID",
      selector: (row) => row.trans_id || "",
      sortable: true,
      center: true,
      width: "140px",
      cell: (row) => (
        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
          {row.trans_id}
        </div>
      ),
    },
    {
      name: "User",
      selector: (row) => row.user_name || "",
      sortable: true,
      width: "150px",
      cell: (row) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{row.user_name}</div>
          <div className="text-xs text-gray-500">ID: {row.user_id}</div>
        </div>
      ),
    },
    {
      name: "Amount",
      selector: (row) => row.amount || "",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <div className="font-bold text-lg text-green-600">
          ₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      name: "Bank Details",
      selector: (row) => row.bank_name || "",
      sortable: true,
      width: "200px",
      cell: (row) => (
        <div className="text-xs">
          <div className="font-medium text-gray-900">{row.bank_name}</div>
          <div className="text-gray-600">{row.bank_acc_holder_name}</div>
          <div className="text-gray-500">****{row.bank_acc_no?.slice(-4)}</div>
          <div className="text-blue-600">{row.bank_ifsc_no}</div>
        </div>
      ),
    },
    {
      name: "PAN Details",
      selector: (row) => row.pan_no || "",
      sortable: true,
      width: "150px",
      cell: (row) => (
        <div className="text-xs">
          <div className="font-medium text-gray-900">{row.pan_name}</div>
          <div className="font-mono text-gray-600">{row.pan_no}</div>
        </div>
      ),
    },
    {
      name: "Updated By",
      selector: (row) => row.updated_by_name || "-",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <div className="text-sm text-gray-600">
          {row.updated_by_name || "-"}
        </div>
      ),
    },
    {
      name: "Dates",
      selector: (row) => row.entry_date,
      sortable: true,
      width: "160px",
      cell: (row) => (
        <div className="text-xs">
          <div className="text-gray-600">
            <span className="font-medium">Entry:</span><br />
            {row.entry_date ? new Date(row.entry_date).toLocaleDateString() : "-"}
          </div>
          <div className="text-gray-600 mt-1">
            <span className="font-medium">Created:</span><br />
            {row.create_at ? new Date(row.create_at).toLocaleDateString() : "-"}
          </div>
        </div>
      ),
    },
    {
      name: "Financial Year",
      selector: (row) => row.financial_year || "",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <div className="text-sm font-medium text-gray-700">
          {row.financial_year}
        </div>
      ),
    },
    {
      name: "Actions",
      cell: (row) =>
        currentStatus === "Success" ? (
          <button
            className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            onClick={() => updateSuccessToReject(row.id, row.reject_reason)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        ) : null,
      center: true,
      omit: currentStatus !== "Success",
      width: "100px",
    },
    {
      name: "Reject Reason",
      cell: (row) =>
        currentStatus === "Success" ? (
          <select
            className="w-full max-w-[180px] p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={row.reject_reason || ""}
            onChange={(e) => handleReasonChange(row.id, e.target.value)}
          >
            <option value="" disabled>
              Select Reason
            </option>
            <option value="Invalid Bank Name">Invalid Bank Name</option>
            <option value="Incorrect IFSC code">IFSC code incorrect</option>
            <option value="Bank detail not found">Bank detail not found</option>
            <option value="Other">Other</option>
          </select>
        ) : currentStatus === "Rejected" ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {row.reject_reason || ""}
          </span>
        ) : null,
      center: true,
      omit: currentStatus === "Pending",
      width: "200px",
    },
  ];

  const customStyles = {
    table: {
      style: {
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      },
    },
    headRow: {
      style: {
        backgroundColor: "#f8fafc",
        borderBottom: "2px solid #e5e7eb",
        fontSize: "0.75rem",
        fontWeight: "600",
        textTransform: "uppercase",
        color: "#374151",
        letterSpacing: "0.05em",
        minHeight: "52px",
      },
    },
    headCells: {
      style: {
        padding: "12px 16px",
        borderRight: "1px solid #f1f5f9",
      },
    },
    rows: {
      style: {
        fontSize: "0.875rem",
        minHeight: "60px",
        borderBottom: "1px solid #f1f5f9",
        "&:hover": {
          backgroundColor: "#f8fafc",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out",
        },
        "&:last-child": {
          borderBottom: "none",
        },
      },
    },
    cells: {
      style: {
        padding: "16px",
        borderRight: "1px solid #f1f5f9",
      },
    },
    pagination: {
      style: {
        border: "none",
        paddingTop: "1.5rem",
        backgroundColor: "#ffffff",
      },
    },
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <div className="container mx-auto max-w-7xl">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Withdrawal Management
                  </h1>
                  <p className="text-gray-600">
                    Manage and track withdrawal requests across different statuses
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Total Records: <span className="font-semibold text-gray-900">{totalItems}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Status Filter Tabs */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex justify-center p-6">
                  <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border">
                    {["Pending", "Success", "Rejected"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setCurrentStatus(status);
                          setCurrentPage(1);
                          loadWithdrawHistory(
                            status,
                            1,
                            sortField,
                            sortDirection,
                            itemsPerPage
                          );
                        }}
                        className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                          currentStatus === status
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {status}
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          currentStatus === status
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}>
                          {data.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Controls Section */}
                {currentStatus === "Pending" && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Filter Section */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Filter by Max ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={filterId}
                            onChange={handleFilterIdInput}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                            placeholder="Enter Max ID"
                            min="2"
                          />
                          <button
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                            onClick={filterWithdrawById}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Actions
                        </label>
                        <button
                          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                          onClick={updatePendingToSuccess}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Mark Selected as Success
                        </button>
                      </div>

                      {/* Settlement Date */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Settlement Date
                        </label>
                        <div className="text-xs text-gray-600 mb-2">
                          Current: <span className="font-medium">{settlementDate}</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                          />
                          <button
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                            onClick={updateSettlementDate}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Show:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          const newLimit = Number(e.target.value);
                          setItemsPerPage(newLimit);
                          setCurrentPage(1);
                          loadWithdrawHistory(
                            currentStatus,
                            1,
                            sortField,
                            sortDirection,
                            newLimit
                          );
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        {[10, 20, 50].map((limit) => (
                          <option key={limit} value={limit}>
                            {limit} rows
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <StatusBadge status={currentStatus} />
                  </div>
                </div>

                {/* Loading Spinner */}
                {loading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                    </div>
                  </div>
                )}

                {/* Data Table */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <DataTable
                    columns={columns}
                    data={data}
                    progressPending={loading}
                    pagination={false}
                    onSort={handleSort}
                    sortServer
                    customStyles={customStyles}
                    noDataComponent={
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No withdrawals found</h3>
                        <p className="mt-1 text-sm text-gray-500">No withdrawal records match your current filters.</p>
                      </div>
                    }
                    selectableRows={currentStatus === "Pending"}
                    onSelectedRowsChange={({ allSelected }) =>
                      handleSelectAll(allSelected)
                    }
                  />
                </div>

                {/* Pagination */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <CustomPagination
                    rowsPerPage={itemsPerPage}
                    totalRows={totalItems}
                    currentPage={currentPage}
                    onChangePage={(page) => {
                      setCurrentPage(page);
                      loadWithdrawHistory(
                        currentStatus,
                        page,
                        sortField,
                        sortDirection,
                        itemsPerPage
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WithdrawList;