'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Tabs, Tab, Alert } from 'react-bootstrap';
import { FaClock, FaPhone, FaEnvelope, FaMapMarkerAlt, FaSave, FaEdit, FaTrash, FaPlus, FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaMapPin, FaCrosshairs } from 'react-icons/fa';
import { db } from '../lib/firebase';
import { ref, get, push, remove, update, set } from 'firebase/database';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { BusinessHours, ContactInfo, RestaurantLocation } from '../types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

export default function SettingsPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [location, setLocation] = useState<RestaurantLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingHours, setEditingHours] = useState<BusinessHours | null>(null);
  const [map, setMap]:any = useState<google.maps.Map | null>(null);
  const [marker, setMarker]:any = useState<google.maps.Marker | null>(null);
  const [searchBox, setSearchBox]:any = useState<google.maps.places.SearchBox | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoursFormData, setHoursFormData] = useState({
    day: 'Monday',
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00'
  });

  useEffect(() => {
    fetchSettings();
    loadGoogleMapsScript(() => setMapLoaded(true));
  }, []);

  const fetchSettings = async () => {
    try {
      const hoursSnapshot = await get(ref(db, 'business_hours'));
      const hoursData: BusinessHours[] = [];
      hoursSnapshot.forEach((child) => {
        hoursData.push({ id: child.key, ...child.val() });
      });
      
      if (hoursData.length === 0) {
        const defaultHours = DAYS_OF_WEEK.map(day => ({
          day,
          isOpen: day !== 'Sunday',
          openTime: '09:00',
          closeTime: '22:00'
        }));
        for (const hour of defaultHours) {
          const newRef = push(ref(db, 'business_hours'));
          await set(newRef, hour);
        }
        fetchSettings();
      } else {
        setBusinessHours(hoursData);
      }

      const contactSnapshot = await get(ref(db, 'contact_info'));
if (contactSnapshot.exists()) {
  const contactData = contactSnapshot.val();
  const contactKey = Object.keys(contactData)[0];
  const contactValue = contactData[contactKey];
  setContactInfo({ id: contactKey, ...contactValue });
}

const locationSnapshot = await get(ref(db, 'restaurant_location'));
if (locationSnapshot.exists()) {
  const locationData = locationSnapshot.val();
  const locationKey = Object.keys(locationData)[0];
  const locationValue = locationData[locationKey];
  setLocation({ id: locationKey, ...locationValue });
}
    } catch (error) {
      toast.error('Failed to fetch settings');
    }
  };

  // Initialize Map
  const initMap = (lat: number, lng: number) => {
    if (!window.google || !mapLoaded) return;

    const mapElement = document.getElementById('location-map');
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
        updateLocationField('latitude', position.lat());
        updateLocationField('longitude', position.lng());
        toast.success('Coordinates updated from map');
      }
    });

    // Click on map to move marker
    mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat && lng) {
        markerInstance.setPosition({ lat, lng });
        updateLocationField('latitude', lat);
        updateLocationField('longitude', lng);
        toast.success('Coordinates updated from map');
      }
    });

    setMap(mapInstance);
    setMarker(markerInstance);

    // Initialize Search Box
    const input = document.getElementById('place-search') as HTMLInputElement;
    if (input) {
      const searchBoxInstance:any = new google.maps.places.SearchBox(input);
      setSearchBox(searchBoxInstance);

      searchBoxInstance.addListener('places_changed', () => {
        const places = searchBoxInstance.getPlaces();
        if (places && places.length > 0) {
          const place = places[0];
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          
          if (lat && lng) {
            mapInstance.setCenter({ lat, lng });
            markerInstance.setPosition({ lat, lng });
            updateLocationField('latitude', lat);
            updateLocationField('longitude', lng);
            updateLocationField('placeId', place.place_id || '');
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
        updateLocationField('latitude', lat);
        updateLocationField('longitude', lng);
        
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

  // Business Hours CRUD
  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hoursData = {
        day: hoursFormData.day,
        isOpen: hoursFormData.isOpen,
        openTime: hoursFormData.openTime,
        closeTime: hoursFormData.closeTime
      };

      if (editingHours?.id) {
        await update(ref(db, `business_hours/${editingHours.id}`), hoursData);
        toast.success('Business hours updated successfully');
      } else {
        await push(ref(db, 'business_hours'), hoursData);
        toast.success('Business hours added successfully');
      }

      resetHoursModal();
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save business hours');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHours = async (id: string) => {
    if (confirm('Are you sure you want to delete these business hours?')) {
      try {
        await remove(ref(db, `business_hours/${id}`));
        toast.success('Business hours deleted successfully');
        fetchSettings();
      } catch (error) {
        toast.error('Failed to delete business hours');
      }
    }
  };

  const editHours = (hours: BusinessHours) => {
    setEditingHours(hours);
    setHoursFormData({
      day: hours.day,
      isOpen: hours.isOpen,
      openTime: hours.openTime,
      closeTime: hours.closeTime
    });
    setShowHoursModal(true);
  };

  const resetHoursModal = () => {
    setShowHoursModal(false);
    setEditingHours(null);
    setHoursFormData({
      day: 'Monday',
      isOpen: true,
      openTime: '09:00',
      closeTime: '22:00'
    });
  };

  // Contact Info CRUD
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contactData = {
        phone: contactInfo?.phone || '',
        email: contactInfo?.email || '',
        whatsapp: contactInfo?.whatsapp || '',
        facebook: contactInfo?.facebook || '',
        instagram: contactInfo?.instagram || '',
        twitter: contactInfo?.twitter || ''
      };

      if (contactInfo?.id) {
        await update(ref(db, `contact_info/${contactInfo.id}`), contactData);
        toast.success('Contact information updated successfully');
      } else {
        const newRef = push(ref(db, 'contact_info'));
        await set(newRef, contactData);
        toast.success('Contact information saved successfully');
      }

      setShowContactModal(false);
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save contact information');
    } finally {
      setLoading(false);
    }
  };

  // Location CRUD
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const locationData = {
        address: location?.address || '',
        city: location?.city || '',
        state: location?.state || '',
        zipCode: location?.zipCode || '',
        country: location?.country || '',
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        placeId: location?.placeId || ''
      };

      if (location?.id) {
        await update(ref(db, `restaurant_location/${location.id}`), locationData);
        toast.success('Location updated successfully');
      } else {
        const newRef = push(ref(db, 'restaurant_location'));
        await set(newRef, locationData);
        toast.success('Location saved successfully');
      }

      setShowLocationModal(false);
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const updateLocationField = (field: string, value: any) => {
    setLocation(prev => prev ? { ...prev, [field]: value } : { [field]: value } as RestaurantLocation);
  };

  // Open location modal and initialize map
  const openLocationModal = () => {
    setShowLocationModal(true);
    setTimeout(() => {
      const lat = location?.latitude || 40.7128;
      const lng = location?.longitude || -74.0060;
      initMap(lat, lng);
    }, 500);
  };

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>Restaurant Settings</h2>
              <p className="text-muted">Manage your business hours, contact details, and location</p>
            </div>
          </div>

          <Tabs defaultActiveKey="hours" className="mb-4" fill>
            {/* Business Hours Tab */}
            <Tab eventKey="hours" title={<span><FaClock className="me-2" />Business Hours</span>}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Header className="bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0" style={{ color: '#6b0c12' }}>Weekly Schedule</h5>
                  <Button 
                    size="sm"
                    onClick={() => setShowHoursModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                      border: 'none',
                      borderRadius: '10px'
                    }}
                  >
                    <FaPlus className="me-1" size={12} /> Add Hours
                  </Button>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    {businessHours.map((hours) => (
                      <Col key={hours.id} md={6} lg={4}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '15px' }}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="fw-bold mb-0" style={{ color: '#6b0c12' }}>{hours.day}</h6>
                              <div className="d-flex gap-2">
                                <Button 
                                  variant="outline-dark" 
                                  size="sm" 
                                  onClick={() => editHours(hours)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <FaEdit size={12} />
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  onClick={() => handleDeleteHours(hours.id!)}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <FaTrash size={12} />
                                </Button>
                              </div>
                            </div>
                            {hours.isOpen ? (
                              <>
                                <Badge bg="success" className="mb-2">Open</Badge>
                                <p className="mb-0 small">
                                  <FaClock className="me-1" /> 
                                  {hours.openTime} - {hours.closeTime}
                                </p>
                              </>
                            ) : (
                              <Badge bg="danger">Closed</Badge>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Tab>

            {/* Contact Info Tab */}
            <Tab eventKey="contact" title={<span><FaPhone className="me-2" />Contact Details</span>}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Header className="bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0" style={{ color: '#6b0c12' }}>Contact Information</h5>
                  <Button 
                    size="sm"
                    onClick={() => setShowContactModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                      border: 'none',
                      borderRadius: '10px'
                    }}
                  >
                    <FaEdit className="me-1" size={12} /> {contactInfo ? 'Edit' : 'Add'} Contact
                  </Button>
                </Card.Header>
                <Card.Body className="p-4">
                  {contactInfo ? (
                    <Row className="g-4">
                      <Col md={6}>
                        <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                          <FaPhone className="me-2" style={{ color: '#6b0c12' }} />
                          <strong>Phone:</strong>
                          <p className="mt-2 mb-0">{contactInfo.phone || 'Not set'}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                          <FaEnvelope className="me-2" style={{ color: '#6b0c12' }} />
                          <strong>Email:</strong>
                          <p className="mt-2 mb-0">{contactInfo.email || 'Not set'}</p>
                        </div>
                      </Col>
                      {contactInfo.whatsapp && (
                        <Col md={6}>
                          <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                            <FaWhatsapp className="me-2" style={{ color: '#25D366' }} />
                            <strong>WhatsApp:</strong>
                            <p className="mt-2 mb-0">{contactInfo.whatsapp}</p>
                          </div>
                        </Col>
                      )}
                      {contactInfo.facebook && (
                        <Col md={6}>
                          <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                            <FaFacebook className="me-2" style={{ color: '#1877F2' }} />
                            <strong>Facebook:</strong>
                            <p className="mt-2 mb-0">{contactInfo.facebook}</p>
                          </div>
                        </Col>
                      )}
                      {contactInfo.instagram && (
                        <Col md={6}>
                          <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                            <FaInstagram className="me-2" style={{ color: '#E4405F' }} />
                            <strong>Instagram:</strong>
                            <p className="mt-2 mb-0">{contactInfo.instagram}</p>
                          </div>
                        </Col>
                      )}
                      {contactInfo.twitter && (
                        <Col md={6}>
                          <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                            <FaTwitter className="me-2" style={{ color: '#1DA1F2' }} />
                            <strong>Twitter:</strong>
                            <p className="mt-2 mb-0">{contactInfo.twitter}</p>
                          </div>
                        </Col>
                      )}
                    </Row>
                  ) : (
                    <Alert variant="info" className="text-center">
                      No contact information added yet. Click the button above to add contact details.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            {/* Location Tab with Google Maps */}
            <Tab eventKey="location" title={<span><FaMapMarkerAlt className="me-2" />Restaurant Location</span>}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Header className="bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0" style={{ color: '#6b0c12' }}>Location & Map</h5>
                  <Button 
                    size="sm"
                    onClick={openLocationModal}
                    style={{
                      background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                      border: 'none',
                      borderRadius: '10px'
                    }}
                  >
                    <FaEdit className="me-1" size={12} /> {location ? 'Edit' : 'Add'} Location
                  </Button>
                </Card.Header>
                <Card.Body className="p-4">
                  {location ? (
                    <Row>
                      <Col lg={5}>
                        <div className="mb-4">
                          <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                            <FaMapMarkerAlt className="me-2" /> Address Details
                          </h6>
                          <div className="p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                            <p className="mb-2"><strong>Address:</strong> {location.address || 'Not set'}</p>
                            <p className="mb-2"><strong>City:</strong> {location.city || 'Not set'}</p>
                            <p className="mb-2"><strong>State:</strong> {location.state || 'Not set'}</p>
                            <p className="mb-2"><strong>Zip Code:</strong> {location.zipCode || 'Not set'}</p>
                            <p className="mb-0"><strong>Country:</strong> {location.country || 'Not set'}</p>
                            <hr />
                            <p className="mb-0 small text-muted">
                              <strong>Coordinates:</strong> {location.latitude || '0'}, {location.longitude || '0'}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col lg={7}>
                        <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>
                          <FaMapPin className="me-2" /> Google Map Preview
                        </h6>
                        <div className="rounded-3 overflow-hidden shadow-sm" style={{ height: '300px' }}>
                          {location.latitude && location.longitude ? (
                            <iframe
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${location.latitude},${location.longitude}&zoom=15`}
                              title="Restaurant Location"
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                              <p className="text-muted">No coordinates set</p>
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>
                  ) : (
                    <Alert variant="info" className="text-center">
                      No location information added yet. Click the button above to add your restaurant location.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Container>
      </div>

      {/* Business Hours Modal */}
      <Modal show={showHoursModal} onHide={resetHoursModal} centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {editingHours ? 'Edit Business Hours' : 'Add Business Hours'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleHoursSubmit}>
          <Modal.Body className="px-4 pb-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Day</Form.Label>
              <Form.Select
                value={hoursFormData.day}
                onChange={(e) => setHoursFormData({ ...hoursFormData, day: e.target.value })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                required
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select
                value={hoursFormData.isOpen ? 'open' : 'closed'}
                onChange={(e) => setHoursFormData({ ...hoursFormData, isOpen: e.target.value === 'open' })}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Form.Select>
            </Form.Group>

            {hoursFormData.isOpen && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Opening Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={hoursFormData.openTime}
                    onChange={(e) => setHoursFormData({ ...hoursFormData, openTime: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Closing Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={hoursFormData.closeTime}
                    onChange={(e) => setHoursFormData({ ...hoursFormData, closeTime: e.target.value })}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4">
            <Button variant="light" onClick={resetHoursModal} className="px-4" style={{ borderRadius: '10px' }}>
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
              <FaSave size={16} />
              {editingHours ? 'Update' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Contact Info Modal */}
      <Modal show={showContactModal} onHide={() => setShowContactModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {contactInfo ? 'Edit Contact Information' : 'Add Contact Information'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleContactSubmit}>
          <Modal.Body className="px-4 pb-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Phone Number *</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={contactInfo?.phone || ''}
                    onChange={(e) => setContactInfo(prev => ({ ...prev!, phone: e.target.value }))}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="contact@restaurant.com"
                    value={contactInfo?.email || ''}
                    onChange={(e) => setContactInfo(prev => ({ ...prev!, email: e.target.value }))}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">WhatsApp Number (Optional)</Form.Label>
              <Form.Control
                type="tel"
                placeholder="+1 234 567 8900"
                value={contactInfo?.whatsapp || ''}
                onChange={(e) => setContactInfo(prev => ({ ...prev!, whatsapp: e.target.value }))}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Facebook URL (Optional)</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://facebook.com/restaurant"
                value={contactInfo?.facebook || ''}
                onChange={(e) => setContactInfo(prev => ({ ...prev!, facebook: e.target.value }))}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Instagram URL (Optional)</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://instagram.com/restaurant"
                value={contactInfo?.instagram || ''}
                onChange={(e) => setContactInfo(prev => ({ ...prev!, instagram: e.target.value }))}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Twitter URL (Optional)</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://twitter.com/restaurant"
                value={contactInfo?.twitter || ''}
                onChange={(e) => setContactInfo(prev => ({ ...prev!, twitter: e.target.value }))}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4">
            <Button variant="light" onClick={() => setShowContactModal(false)} className="px-4" style={{ borderRadius: '10px' }}>
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
              <FaSave size={16} />
              Save Contact Info
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Location Modal with Interactive Map - Simplified */}
      <Modal show={showLocationModal} onHide={() => setShowLocationModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {location ? 'Edit Restaurant Location' : 'Add Restaurant Location'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleLocationSubmit}>
          <Modal.Body className="px-4 pb-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            
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
                Search or click on map to set coordinates
              </Form.Text>
            </div>

            {/* Interactive Map */}
            <div className="mb-4">
              <Form.Label className="fw-semibold">Click on Map to Select Location</Form.Label>
              <div 
                id="location-map" 
                style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                className="border shadow-sm"
              ></div>
            </div>

            {/* Coordinates Row - Can be manually edited */}
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Latitude *</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    placeholder="40.7128"
                    value={location?.latitude || ''}
                    onChange={(e) => {
                      updateLocationField('latitude', parseFloat(e.target.value));
                      if (map && marker && e.target.value) {
                        const lat = parseFloat(e.target.value);
                        const lng = location?.longitude || 0;
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
                    value={location?.longitude || ''}
                    onChange={(e) => {
                      updateLocationField('longitude', parseFloat(e.target.value));
                      if (map && marker && e.target.value) {
                        const lat = location?.latitude || 0;
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

            {/* Address Details - Admin enters manually */}
            <h6 className="fw-bold mb-3" style={{ color: '#6b0c12' }}>Address Details (Enter Manually)</h6>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Street Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="123 Main Street"
                value={location?.address || ''}
                onChange={(e) => updateLocationField('address', e.target.value)}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">City</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="New York"
                    value={location?.city || ''}
                    onChange={(e) => updateLocationField('city', e.target.value)}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">State</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="NY"
                    value={location?.state || ''}
                    onChange={(e) => updateLocationField('state', e.target.value)}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Zip Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="10001"
                    value={location?.zipCode || ''}
                    onChange={(e) => updateLocationField('zipCode', e.target.value)}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Country</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="United States"
                    value={location?.country || ''}
                    onChange={(e) => updateLocationField('country', e.target.value)}
                    style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Place ID (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="ChIJd8BlQ2BZwokRAFUEcm_cxeA"
                value={location?.placeId || ''}
                onChange={(e) => updateLocationField('placeId', e.target.value)}
                style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4">
            <Button variant="light" onClick={() => setShowLocationModal(false)} className="px-4" style={{ borderRadius: '10px' }}>
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
              <FaSave size={16} />
              Save Location
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}