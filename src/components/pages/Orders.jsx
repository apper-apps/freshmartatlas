import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle, ChevronDown, ChevronUp, Clock, Copy, Download, Eye, Filter, MessageCircle, Package, RefreshCw, Search, Star, Truck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import ApperIcon from "@/components/ApperIcon";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import OrderStatusBadge from "@/components/molecules/OrderStatusBadge";
import { ClipboardService } from "@/services/ClipboardService";
import { orderService } from "@/services/api/orderService";
import { formatCurrency } from "@/utils/currency";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getAllOrders();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
      toast.success('Orders refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  const handleCopyOrderId = async (orderId) => {
    try {
      await ClipboardService.copyText(orderId);
      toast.success('Order ID copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy order ID');
    }
  };

  const handleDownloadReceipt = async (orderId) => {
    try {
      await orderService.downloadReceipt(orderId);
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      toast.error('Failed to download receipt');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || checkDateFilter(order.createdAt, dateFilter);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const checkDateFilter = (date, filter) => {
    const orderDate = new Date(date);
    const today = new Date();
    
    switch (filter) {
      case 'today':
        return orderDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= monthAgo;
      default:
        return true;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'ready': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) return <Loading />;
  if (error) return <Error message={error} onRetry={fetchOrders} />;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
              <p className="text-gray-600 mt-2">Manage and track your orders</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {dateOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Empty
              icon={Package}
              title="No orders found"
              description="No orders match your current filters"
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">Order</span>
                          <span className="font-mono text-sm text-gray-900">#{order.id}</span>
                          <button
                            onClick={() => handleCopyOrderId(order.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                        </span>
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {expandedOrder === order.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Customer</span>
                        <p className="text-sm text-gray-900">{order.customer?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Items</span>
                        <p className="text-sm text-gray-900">{order.items?.length || 0} items</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total</span>
                        <p className="text-sm font-semibold text-gray-900">
                          ${order.total?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                            <div className="space-y-2">
                              {order.items?.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Information</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs text-gray-500">Address</span>
                                <p className="text-sm text-gray-900">{order.deliveryAddress || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Phone</span>
                                <p className="text-sm text-gray-900">{order.customer?.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Special Instructions</span>
                                <p className="text-sm text-gray-900">{order.specialInstructions || 'None'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDownloadReceipt(order.id)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              <Download className="w-4 h-4" />
                              <span>Receipt</span>
                            </button>
                            <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                              <MessageCircle className="w-4 h-4" />
                              <span>Message</span>
                            </button>
                          </div>
                          <div className="flex space-x-2">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                              >
                                Confirm
                              </button>
                            )}
                            {order.status === 'confirmed' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'preparing')}
                                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                              >
                                Start Preparing
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'ready')}
                                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                              >
                                Mark Ready
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                              >
                                Mark Delivered
                              </button>
                            )}
                            {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Orders;