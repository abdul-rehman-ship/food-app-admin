'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaSave, FaTruck, FaMotorcycle, FaCar, FaPhone, FaIdCard, FaCrosshairs, FaSearch } from 'react-icons/fa';
import { db } from '../lib/firebase';
import { ref, get, push, remove, update } from 'firebase/database';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { Trailor } from '../types';

// Load Google Maps API
const loadGoogleMapsScript = (callback: () => void) => {
  if (document.querySelector('#google-maps-script')) {
    callback();
    return;
  }
  
  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
};

export default function TrailorsPage() {
  const [trailors, setTrailors] = useState<Trailor[]>([]);
  const [filteredTrailors, setFilteredTrailors] = useState<Trailor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTrailor, setEditingTrailor] = useState<Trailor | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    driverId: '',
    phone: '',
    latitude: 40.7128,
    longitude: -74.0060,
    address: '',
    status: 'available' as 'available' | 'busy' | 'offline',
    vehicleType: 'bike' as 'bike' | 'car' | 'van' | 'truck',
    vehicleNumber: ''
  });

  useEffect(() => {
    fetchTrailors();
    loadGoogleMapsScript(() => setMapLoaded(true));
  }, []);

  useEffect(() => {
    filterTrailors();
  }, [searchTerm, statusFilter, trailors]);

  const fetchTrailors = async () => {
    try {
      const snapshot = await get(ref(db, 'trailors'));
      const data: Trailor[] = [];
      snapshot.forEach((child) => {
        data.push({ id: child.key, ...child.val() });
      });
      setTrailors(data.reverse());
      setFilteredTrailors(data.reverse());
    } catch (error) {
      toast.error('Failed to fetch trailors');
    }
  };

  const filterTrailors = () => {
    let filtered = [...trailors];
    
    if (searchTerm) {
      filtered = filtered.filter(trailor => 
        trailor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailor.driverId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailor.number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(trailor => trailor.status === statusFilter);
    }
    
    setFilteredTrailors(filtered);
  };

  // Initialize Map
  const initMap = (lat: number, lng: number) => {
    const google = (window as any).google;
    if (!google || !mapLoaded) return;

    const mapElement = document.getElementById('trailor-map');
    if (!mapElement) return;

    const mapInstance = new google.maps.Map(mapElement, {
      center: { lat, lng },
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    const markerInstance = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    // Update coordinates when marker is dragged
    markerInstance.addListener('dragend', () => {
      const position = markerInstance.getPosition();
      if (position) {
        setFormData((prev: any) => ({
          ...prev,
          latitude: position.lat(),
          longitude: position.lng()
        }));
        toast.success('Location updated from map');
      }
    });

    // Click on map to move marker
    mapInstance.addListener('click', (e: any) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat && lng) {
        markerInstance.setPosition({ lat, lng });
        setFormData((prev: any) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        toast.success('Location updated from map');
      }
    });

    setMap(mapInstance);
    setMarker(markerInstance);

    // Initialize Search Box
    const input = document.getElementById('place-search') as HTMLInputElement;
    if (input) {
      const searchBoxInstance = new google.maps.places.SearchBox(input);
      
      searchBoxInstance.addListener('places_changed', () => {
        const places = searchBoxInstance.getPlaces();
        if (places && places.length > 0) {
          const place = places[0];
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          
          if (lat && lng) {
            mapInstance.setCenter({ lat, lng });
            markerInstance.setPosition({ lat, lng });
            setFormData((prev: any) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              address: place.formatted_address || ''
            }));
            toast.success('Location found from search');
          }
        }
      });
    }
  };

  // Get current user location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormData((prev: any) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        
        if (map && marker) {
          map.setCenter({ lat, lng });
          marker.setPosition({ lat, lng });
        }
        toast.success('Current location loaded');
      },
      () => {
        toast.error('Unable to get your location');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.number || !formData.driverId || !formData.phone || !formData.vehicleNumber) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const trailorData = {
        name: formData.name,
        number: formData.number,
        driverId: formData.driverId,
        phone: formData.phone,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        status: formData.status,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        createdAt: Date.now()
      };
      
      if (editingTrailor?.id) {
        await update(ref(db, `trailors/${editingTrailor.id}`), trailorData);
        toast.success('Trailor updated successfully');
      } else {
        await push(ref(db, 'trailors'), trailorData);
        toast.success('Trailor added successfully');
      }
      
      resetModal();
      fetchTrailors();
    } catch (error) {
      toast.error('Failed to save trailor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trailor?')) {
      try {
        await remove(ref(db, `trailors/${id}`));
        toast.success('Trailor deleted successfully');
        fetchTrailors();
      } catch (error) {
        toast.error('Failed to delete trailor');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingTrailor(null);
    setFormData({
      name: '',
      number: '',
      driverId: '',
      phone: '',
      latitude: 40.7128,
      longitude: -74.0060,
      address: '',
      status: 'available',
      vehicleType: 'bike',
      vehicleNumber: ''
    });
  };

  const editTrailor = (trailor: Trailor) => {
    setEditingTrailor(trailor);
    setFormData({
      name: trailor.name,
      number: trailor.number,
      driverId: trailor.driverId,
      phone: trailor.phone,
      latitude: trailor.latitude,
      longitude: trailor.longitude,
      address: trailor.address || '',
      status: trailor.status,
      vehicleType: trailor.vehicleType,
      vehicleNumber: trailor.vehicleNumber
    });
    setShowModal(true);
    setTimeout(() => {
      initMap(trailor.latitude, trailor.longitude);
    }, 500);
  };

  const openModal = () => {
    setShowModal(true);
    setTimeout(() => {
      initMap(40.7128, -74.0060);
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available':
        return <Badge bg="success">Available</Badge>;
      case 'busy':
        return <Badge bg="warning">Busy</Badge>;
      case 'offline':
        return <Badge bg="secondary">Offline</Badge>;
      default:
        return <Badge bg="light">Unknown</Badge>;
    }
  };

  const getVehicleIcon = (type: string) => {
    switch(type) {
      case 'bike':
        return <FaMotorcycle />;
      case 'car':
        return <FaCar />;
      case 'van':
        return <FaTruck />;
      case 'truck':
        return <FaTruck />;
      default:
        return <FaTruck />;
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>Trailors Management</h2>
              <p className="text-muted">Manage delivery fleet and their locations</p>
            </div>
            <Button 
              onClick={openModal}
              style={{
                background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px'
              }}
            >
              <FaPlus className="me-2" /> Add New Trailor
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mb-4">
            <Row className="g-3">
              <Col md={8}>
                <div className="position-relative">
                  <FaSearch className="position-absolute text-muted" style={{ top: '14px', left: '16px' }} />
                  <Form.Control
                    type="text"
                    placeholder="Search by name, driver ID, or number..."
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
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </Form.Select>
              </Col>
            </Row>
          </div>

          {/* Trailors Grid */}
          {filteredTrailors.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Body>
                <FaTruck size={60} className="text-muted mb-3" />
                <h5 className="text-muted">No trailors found</h5>
                <p className="text-muted">Click the button above to add your first trailor</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {filteredTrailors.map((trailor) => (
                <Col key={trailor.id} md={6} lg={4}>
                  <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                              color: 'white'
                            }}
                          >
                            {getVehicleIcon(trailor.vehicleType)}
                          </div>
                          <div>
                            <h5 className="fw-bold mb-0" style={{ color: '#6b0c12' }}>{trailor.name}</h5>
                            <small className="text-muted">ID: {trailor.driverId}</small>
                          </div>
                        </div>
                        {getStatusBadge(trailor.status)}
                      </div>
                      
                      <div className="mb-3">
                        <p className="mb-1 small">
                          <strong>Number:</strong> {trailor.number}
                        </p>
                        <p className="mb-1 small">
                          <strong>Phone:</strong> {trailor.phone}
                        </p>
                        <p className="mb-1 small">
                          <strong>Vehicle:</strong> {trailor.vehicleNumber}
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="mb-1 small text-muted">
                          <FaMapMarkerAlt className="me-1" size={12} />
                          {trailor.address || 'Address not set'}
                        </p>
                        <p className="mb-0 small text-muted">
                          <strong>Coordinates:</strong> {trailor.latitude}, {trailor.longitude}
                        </p>
                      </div>
                    </Card.Body>
                    
                    <Card.Footer className="bg-white border-0 pb-4 px-4">
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-dark" 
                          size="sm" 
                          onClick={() => editTrailor(trailor)}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: '10px' }}
                        >
                          <FaEdit size={14} /> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(trailor.id!)}
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

      {/* Add/Edit Trailor Modal */}
      <Modal show={showModal} onHide={resetModal} size="lg" centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {editingTrailor ? 'Edit Trailor' : 'Add New Trailor'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 pb-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Basic Information */}
            <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>Basic Information</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Trailor Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., John's Bike"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Trailor Number *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., T-001"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Driver ID *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., DRV001"
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Phone Number *</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Vehicle Type</Form.Label>
                  <Form.Select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  >
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Vehicle Number *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., ABC-123"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Location Section */}
            <h6 className="fw-bold mb-3 mt-3" style={{ color: '#6b0c12' }}>Location Information</h6>
            
            {/* Search Box for Map */}
            <div className="mb-3">
              <Form.Label className="fw-semibold">Search Location on Map</Form.Label>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  id="place-search"
                  className="form-control"
                  placeholder="Search for a place or address..."
                  style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                />
                <Button
                  type="button"
                  onClick={getCurrentLocation}
                  style={{
                    background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 20px'
                  }}
                >
                  <FaCrosshairs /> My Location
                </Button>
              </div>
              <Form.Text className="text-muted">
                Search, click on map, or drag marker to set location
              </Form.Text>
            </div>

            {/* Interactive Map */}
            <div className="mb-4">
              <Form.Label className="fw-semibold">Click on Map to Select Location</Form.Label>
              <div 
                id="trailor-map" 
                style={{ height: '350px', width: '100%', borderRadius: '12px' }}
                className="border shadow-sm"
              ></div>
            </div>

            {/* Coordinates Row - Can be manually edited */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Latitude *</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    placeholder="40.7128"
                    value={formData.latitude}
                    onChange={(e) => {
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) });
                      if (map && marker && e.target.value) {
                        const lat = parseFloat(e.target.value);
                        const lng = formData.longitude;
                        map.setCenter({ lat, lng });
                        marker.setPosition({ lat, lng });
                      }
                    }}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Longitude *</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    placeholder="-74.0060"
                    value={formData.longitude}
                    onChange={(e) => {
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) });
                      if (map && marker && e.target.value) {
                        const lat = formData.latitude;
                        const lng = parseFloat(e.target.value);
                        map.setCenter({ lat, lng });
                        marker.setPosition({ lat, lng });
                      }
                    }}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Address (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Full address of trailor location"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>
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
              {editingTrailor ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}