'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaCity, FaMapMarkerAlt, FaDollarSign, FaSave, FaToggleOn, FaToggleOff, FaIdCard } from 'react-icons/fa';
import { db } from '../lib/firebase';
import { ref, get, push, remove, update, set } from 'firebase/database';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { City } from '../types';

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    deliveryFee: '',
    isActive: true
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    filterCities();
  }, [searchTerm, statusFilter, cities]);

  const fetchCities = async () => {
    try {
      const snapshot = await get(ref(db, 'cities'));
      const data: City[] = [];
      snapshot.forEach((child) => {
        data.push({ id: child.key, ...child.val() });
      });
      setCities(data.reverse());
      setFilteredCities(data.reverse());
    } catch (error) {
      toast.error('Failed to fetch cities');
    }
  };

  const filterCities = () => {
    let filtered = [...cities];
    
    if (searchTerm) {
      filtered = filtered.filter(city => 
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== '') {
      filtered = filtered.filter(city => city.isActive === (statusFilter === 'active'));
    }
    
    setFilteredCities(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.state || !formData.deliveryFee) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const cityData = {
        name: formData.name.trim(),
        state: formData.state.trim(),
        deliveryFee: parseFloat(formData.deliveryFee),
        isActive: formData.isActive,
        createdAt: Date.now()
      };
      
      if (editingCity?.id) {
        // Update existing city
        await update(ref(db, `cities/${editingCity.id}`), cityData);
        toast.success('City updated successfully');
      } else {
        // Create new city with auto-generated ID
        const newCityRef = push(ref(db, 'cities'));
        const newCityId = newCityRef.key;
        await set(newCityRef, cityData);
        toast.success(`City added successfully with ID: ${newCityId?.slice(-8)}`);
      }
      
      resetModal();
      fetchCities();
    } catch (error) {
      toast.error('Failed to save city');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this city?')) {
      try {
        await remove(ref(db, `cities/${id}`));
        toast.success('City deleted successfully');
        fetchCities();
      } catch (error) {
        toast.error('Failed to delete city');
      }
    }
  };

  const toggleStatus = async (city: City) => {
    try {
      await update(ref(db, `cities/${city.id}`), { isActive: !city.isActive });
      toast.success(`${city.name} is now ${!city.isActive ? 'active' : 'inactive'}`);
      fetchCities();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingCity(null);
    setFormData({
      name: '',
      state: '',
      deliveryFee: '',
      isActive: true
    });
  };

  const editCity = (city: City) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      state: city.state,
      deliveryFee: city.deliveryFee.toString(),
      isActive: city.isActive
    });
    setShowModal(true);
  };

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>
                <FaCity className="me-2" /> Cities Management
              </h2>
              <p className="text-muted">Manage delivery cities and their fees</p>
            </div>
            <Button 
              onClick={() => setShowModal(true)}
              style={{
                background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px'
              }}
            >
              <FaPlus className="me-2" /> Add New City
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mb-4">
            <Row className="g-3">
              <Col md={8}>
                <div className="position-relative">
                  <FaCity className="position-absolute text-muted" style={{ top: '14px', left: '16px' }} />
                  <Form.Control
                    type="text"
                    placeholder="Search by city or state name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-3 ps-5"
                    style={{ borderRadius: '12px', border: '2px solid #e0e0e0' }}
                  />
                </div>
              </Col>
              <Col md={4}>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-3"
                  style={{ borderRadius: '12px', border: '2px solid #e0e0e0' }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Col>
            </Row>
          </div>

          {/* Cities Grid */}
          {filteredCities.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Body>
                <FaCity size={60} className="text-muted mb-3" />
                <h5 className="text-muted">No cities found</h5>
                <p className="text-muted">Click the button above to add your first city</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {filteredCities.map((city) => (
                <Col key={city.id} md={6} lg={4} xl={3}>
                  <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{ 
                            width: '50px', 
                            height: '50px', 
                            background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                            color: 'white'
                          }}
                        >
                          <FaCity size={24} />
                        </div>
                        <Button
                          variant="link"
                          onClick={() => toggleStatus(city)}
                          className="p-0 text-decoration-none"
                          style={{ fontSize: '24px' }}
                        >
                          {city.isActive ? (
                            <FaToggleOn style={{ color: '#28a745' }} />
                          ) : (
                            <FaToggleOff style={{ color: '#dc3545' }} />
                          )}
                        </Button>
                      </div>
                      
                      <h5 className="fw-bold mb-1" style={{ color: '#6b0c12' }}>{city.name}</h5>
                      <p className="text-muted mb-2">
                        <FaMapMarkerAlt className="me-1" size={12} />
                        {city.state}
                      </p>
                      
                      <div className="mb-2">
                        <small className="text-muted">
                          <FaIdCard className="me-1" size={10} />
                          ID: {city.id?.slice(-8)}
                        </small>
                      </div>
                      
                      <div className="mb-3">
                        <Badge 
                          bg="dark" 
                          className="px-3 py-2 d-flex align-items-center justify-content-center gap-2"
                          style={{ fontSize: '14px' }}
                        >
                          <FaDollarSign size={14} />
                          Delivery Fee: ${city.deliveryFee.toFixed(2)}
                        </Badge>
                      </div>
                      
                      <Badge 
                        bg={city.isActive ? 'success' : 'danger'} 
                        className="px-3 py-2"
                      >
                        {city.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Card.Body>
                    
                    <Card.Footer className="bg-white border-0 pb-4 px-4">
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-dark" 
                          size="sm" 
                          onClick={() => editCity(city)}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: '10px' }}
                        >
                          <FaEdit size={14} /> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(city.id!)}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: '10px' }}
                        >
                          <FaTrash size={14} /> Delete
                        </Button>
                      </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </div>

      {/* Add/Edit City Modal */}
      <Modal show={showModal} onHide={resetModal} centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {editingCity ? 'Edit City' : 'Add New City'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 pb-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">City Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., New York"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">State *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., New York"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Delivery Fee ($) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="e.g., 5.99"
                value={formData.deliveryFee}
                onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>

            {/* Display ID info for new city */}
            {!editingCity && (
              <div className="alert alert-info mt-3 py-2">
                <small>
                  <FaIdCard className="me-2" />
                  A unique ID will be automatically generated for this city when saved.
                </small>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4">
            <Button variant="light" onClick={resetModal} className="px-4" style={{ borderRadius: '10px' }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-4 d-flex align-items-center gap-2"
              style={{ 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                border: 'none'
              }}
            >
              {loading ? <Spinner animation="border" size="sm" /> : <FaSave size={16} />}
              {editingCity ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}