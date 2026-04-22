'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form, Spinner, Image } from 'react-bootstrap';
import { FaBox, FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaDollarSign, FaTruck, FaCheck, FaTimes, FaClock, FaEye, FaMotorcycle, FaCity, FaArrowRight, FaSpinner } from 'react-icons/fa';
import { db } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { Order, User } from '../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, typeFilter, orders]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersSnapshot = await get(ref(db, 'orders'));
      const ordersData: Order[] = [];
      ordersSnapshot.forEach((child) => {
        ordersData.push({ id: child.key, ...child.val() });
      });
      
      ordersData.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(ordersData);
      setFilteredOrders(ordersData);

      const usersSnapshot = await get(ref(db, 'users'));
      const usersData: Record<string, User> = {};
      usersSnapshot.forEach((child) => {
        const userData = child.val();
        usersData[userData.userId] = { ...userData, userId: child.key || userData.userId };
      });
      setUsers(usersData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.orderType === typeFilter);
    }
    
    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setProcessingOrderId(orderId);
    
    try {
      const order = orders.find(o => o.id === orderId);
      
      // If accepting order, check and update stock
      if (newStatus === 'accepted') {
        if (order && order.items) {
          for (const item of order.items) {
            const foodRef = ref(db, `food_items/${item.foodId}`);
            const foodSnapshot = await get(foodRef);
            const foodData = foodSnapshot.val();
            
            if (!foodData) {
              toast.error(`Food item "${item.foodName}" not found in database`);
              setProcessingOrderId(null);
              return;
            }
            
            if (foodData.stock < item.quantity) {
              toast.error(`Insufficient stock for "${item.foodName}". Available: ${foodData.stock}, Required: ${item.quantity}`);
              setProcessingOrderId(null);
              return;
            }
          }
          
          for (const item of order.items) {
            const foodRef = ref(db, `food_items/${item.foodId}`);
            const foodSnapshot = await get(foodRef);
            const foodData = foodSnapshot.val();
            const newStock = foodData.stock - item.quantity;
            await update(foodRef, { stock: newStock });
          }
          
          toast.success('Stock updated successfully');
        }
      }
      
      await update(ref(db, `orders/${orderId}`), { status: newStatus });
      toast.success(`Order ${newStatus.toUpperCase()} successfully`);
      await fetchData();
      
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge bg="warning" className="px-3 py-2" style={{ fontSize: '12px' }}>Pending</Badge>;
      case 'accepted':
        return <Badge bg="info" className="px-3 py-2" style={{ fontSize: '12px' }}>Accepted</Badge>;
      case 'preparing':
        return <Badge bg="primary" className="px-3 py-2" style={{ fontSize: '12px' }}>Preparing</Badge>;
      case 'ready_for_pickup':
        return <Badge bg="success" className="px-3 py-2" style={{ fontSize: '12px' }}>Ready for Pickup</Badge>;
      case 'on_the_way':
        return <Badge bg="info" className="px-3 py-2" style={{ fontSize: '12px' }}>On The Way</Badge>;
      case 'delivered':
        return <Badge bg="success" className="px-3 py-2" style={{ fontSize: '12px' }}>Delivered</Badge>;
      case 'rejected':
        return <Badge bg="danger" className="px-3 py-2" style={{ fontSize: '12px' }}>Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2" style={{ fontSize: '12px' }}>{status}</Badge>;
    }
  };

  const getStatusActions = (order: Order) => {
    const isProcessing = processingOrderId === order.id;
    
    if (order.status === 'pending') {
      return (
        <div className="d-flex gap-2 mt-3">
          <Button 
            size="sm" 
            variant="success"
            onClick={() => updateOrderStatus(order.id!, 'accepted')}
            disabled={isProcessing}
            className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '8px' }}
          >
            {isProcessing ? <Spinner animation="border" size="sm" /> : <FaCheck size={14} />}
            Accept Order
          </Button>
          <Button 
            size="sm" 
            variant="danger"
            onClick={() => updateOrderStatus(order.id!, 'rejected')}
            disabled={isProcessing}
            className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '8px' }}
          >
            <FaTimes size={14} /> Reject Order
          </Button>
        </div>
      );
    }
    
    if (order.status === 'accepted') {
      if (order.orderType === 'delivery') {
        return (
          <div className="d-flex gap-2 mt-3">
            <Button 
              size="sm" 
              variant="info"
              onClick={() => updateOrderStatus(order.id!, 'on_the_way')}
              disabled={isProcessing}
              className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
              style={{ borderRadius: '8px' }}
            >
              <FaTruck size={14} /> On The Way
            </Button>
          </div>
        );
      } else {
        return (
          <div className="d-flex gap-2 mt-3">
            <Button 
              size="sm" 
              variant="primary"
              onClick={() => updateOrderStatus(order.id!, 'preparing')}
              disabled={isProcessing}
              className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
              style={{ borderRadius: '8px' }}
            >
              <FaSpinner size={14} /> Start Preparing
            </Button>
          </div>
        );
      }
    }
    
    if (order.status === 'preparing') {
      return (
        <div className="d-flex gap-2 mt-3">
          <Button 
            size="sm" 
            variant="success"
            onClick={() => updateOrderStatus(order.id!, 'ready_for_pickup')}
            disabled={isProcessing}
            className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '8px' }}
          >
            <FaCheck size={14} /> Ready for Pickup
          </Button>
        </div>
      );
    }
    
    if (order.status === 'on_the_way') {
      return (
        <div className="d-flex gap-2 mt-3">
          <Button 
            size="sm" 
            variant="success"
            onClick={() => updateOrderStatus(order.id!, 'delivered')}
            disabled={isProcessing}
            className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '8px' }}
          >
            <FaCheck size={14} /> Mark as Delivered
          </Button>
        </div>
      );
    }
    
    if (order.status === 'ready_for_pickup') {
      return (
        <div className="d-flex gap-2 mt-3">
          <Button 
            size="sm" 
            variant="success"
            onClick={() => updateOrderStatus(order.id!, 'delivered')}
            disabled={isProcessing}
            className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '8px' }}
          >
            <FaCheck size={14} /> Mark as Picked Up
          </Button>
        </div>
      );
    }
    
    return null;
  };

  const getUserDetails = (userId: string) => {
    return users[userId] || null;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8f9fa' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>
                <FaBox className="me-2" /> Orders Management
              </h2>
              <p className="text-muted">Manage customer orders, update status, and track deliveries</p>
            </div>
            <div className="text-muted">
              Total Orders: <strong className="text-dark">{filteredOrders.length}</strong>
            </div>
          </div>

          <div className="mb-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="fw-semibold">Filter by Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2"
                  style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="on_the_way">On The Way</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Filter by Type</Form.Label>
                <Form.Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="py-2"
                  style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                >
                  <option value="all">All Types</option>
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pickup</option>
                </Form.Select>
              </Col>
            </Row>
          </div>

          {filteredOrders.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Body>
                <FaBox size={60} className="text-muted mb-3" />
                <h5 className="text-muted">No orders found</h5>
                <p className="text-muted">Orders will appear here once customers place them</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {filteredOrders.map((order) => {
                const user = getUserDetails(order.userId);
                const firstItem = order.items?.[0];
                
                return (
                  <Col key={order.id} lg={6} xl={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                      <div className="p-3" style={{ background: 'linear-gradient(135deg, #6b0c12, #8f1018)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-white-50">Order #{order.orderId?.slice(-8)}</small>
                            <h6 className="text-white mb-0">{formatDate(order.createdAt)}</h6>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      
                      <Card.Body className="p-4">
                        {user && (
                          <div className="mb-3 pb-2 border-bottom">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <FaUser style={{ color: '#6b0c12' }} />
                              <strong className="text-dark">{user.fullName}</strong>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <FaPhone size={12} className="text-muted" />
                              <small className="text-muted">{user.mobileNumber}</small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <FaEnvelope size={12} className="text-muted" />
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </div>
                        )}
                        
                        <div className="mb-3">
                          {firstItem && (
                            <div className="d-flex gap-3">
                              {firstItem.foodImage && (
                                <Image 
                                  src={firstItem.foodImage} 
                                  width={60} 
                                  height={60} 
                                  style={{ objectFit: 'cover', borderRadius: '10px' }}
                                />
                              )}
                              <div className="flex-grow-1">
                                <h6 className="fw-bold mb-1">{firstItem.foodName}</h6>
                                <div className="d-flex flex-wrap gap-2 mb-1">
                                  <Badge bg="light" text="dark" className="px-2 py-1">
                                    {firstItem.quantity} x ${firstItem.sizePrice}
                                  </Badge>
                                  <Badge bg="light" text="dark" className="px-2 py-1">
                                    Size: {firstItem.selectedSize}
                                  </Badge>
                                </div>
                                {order.items && order.items.length > 1 && (
                                  <small className="text-muted">+{order.items.length - 1} more item(s)</small>
                                )}
                              </div>
                              <div className="text-end">
                                <strong>${firstItem.totalPrice}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {order.orderType === 'delivery' && (
                          <div className="mb-3 p-2 rounded-3" style={{ background: '#f8f9fa' }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <FaMapMarkerAlt size={12} style={{ color: '#6b0c12' }} />
                              <strong className="small">Delivery Address</strong>
                            </div>
                            <p className="small text-muted mb-1">{order.deliveryAddress}</p>
                            <div className="d-flex align-items-center gap-2">
                              <FaCity size={12} className="text-muted" />
                              <small className="text-muted">{order.cityName}, {order.cityState}</small>
                            </div>
                          </div>
                        )}
                        
                        {order.trailerName && (
                          <div className="mb-3 p-2 rounded-3" style={{ background: '#e8f5e9' }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <FaTruck size={12} style={{ color: '#2e7d32' }} />
                              <strong className="small">Assigned Trailer</strong>
                            </div>
                            <div className="small">
                              <div className="fw-semibold">{order.trailerName}</div>
                              <div className="text-muted">{order.trailerPhone}</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-top">
                          <div className="d-flex justify-content-between mb-1">
                            <small>Subtotal:</small>
                            <small>${order.subtotal?.toFixed(2)}</small>
                          </div>
                          {order.deliveryFee > 0 && (
                            <div className="d-flex justify-content-between mb-1">
                              <small>Delivery Fee:</small>
                              <small>${order.deliveryFee?.toFixed(2)}</small>
                            </div>
                          )}
                          <div className="d-flex justify-content-between fw-bold mt-2">
                            <span>Total:</span>
                            <span style={{ color: '#6b0c12' }}>${order.total?.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {getStatusActions(order)}
                        
                        <Button 
                          variant="outline-dark" 
                          size="sm" 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                          className="w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: '10px' }}
                        >
                          <FaEye size={14} /> View Full Details
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Container>
      </div>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        {selectedOrder && (
          <>
            <Modal.Header closeButton className="border-0 pt-4 px-4">
              <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
                Order Details #{selectedOrder.orderId?.slice(-8)}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 pb-4">
              <div className="mb-4 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">Order Status</small>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">Order Date</small>
                    <div className="small fw-semibold">{formatDate(selectedOrder.createdAt)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <div className="d-flex gap-2">
                    {getStatusActions(selectedOrder)}
                  </div>
                </div>
              </div>

              {(() => {
                const user = getUserDetails(selectedOrder.userId);
                return user && (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                      <FaUser className="me-2" /> Customer Information
                    </h6>
                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Full Name</small>
                          <p className="mb-0 fw-semibold">{user.fullName}</p>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Email</small>
                          <p className="mb-0">{user.email}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Mobile Number</small>
                          <p className="mb-0">{user.mobileNumber}</p>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Customer Since</small>
                          <p className="mb-0">{formatDate(user.registeredAt)}</p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
              })()}

              <div className="mb-4">
                <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                  <FaBox className="me-2" /> Order Items
                </h6>
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="d-flex gap-3 mb-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                    {item.foodImage && (
                      <Image 
                        src={item.foodImage} 
                        width={80} 
                        height={80} 
                        style={{ objectFit: 'cover', borderRadius: '10px' }}
                      />
                    )}
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-1">{item.foodName}</h6>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        <Badge bg="light" text="dark">Quantity: {item.quantity}</Badge>
                        <Badge bg="light" text="dark">Size: {item.selectedSize}</Badge>
                        <Badge bg="light" text="dark">Price: ${item.sizePrice}</Badge>
                      </div>
                      <div className="fw-bold" style={{ color: '#6b0c12' }}>
                        Total: ${item.totalPrice}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrder.orderType === 'delivery' && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                    <FaMapMarkerAlt className="me-2" /> Delivery Information
                  </h6>
                  <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                    <p className="mb-2"><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                    <p className="mb-2"><strong>City:</strong> {selectedOrder.cityName}, {selectedOrder.cityState}</p>
                    <p className="mb-0"><strong>Delivery Fee:</strong> ${selectedOrder.deliveryFee?.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {selectedOrder.trailerName && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                    <FaTruck className="me-2" /> Assigned Trailer
                  </h6>
                  <div className="p-3 rounded-3" style={{ background: '#e8f5e9' }}>
                    <p className="mb-2"><strong>Name:</strong> {selectedOrder.trailerName}</p>
                    <p className="mb-2"><strong>Phone:</strong> {selectedOrder.trailerPhone}</p>
                    {selectedOrder.trailerAddress && (
                      <p className="mb-0"><strong>Address:</strong> {selectedOrder.trailerAddress}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-top">
                <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>Order Summary</h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>${selectedOrder.subtotal?.toFixed(2)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Delivery Fee:</span>
                    <span>${selectedOrder.deliveryFee?.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mt-2 pt-2 border-top fw-bold">
                  <span style={{ fontSize: '16px' }}>Total:</span>
                  <span style={{ fontSize: '18px', color: '#6b0c12' }}>${selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-0 pb-4 px-4">
              <Button variant="light" onClick={() => setShowDetailModal(false)} className="px-4" style={{ borderRadius: '10px' }}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
}