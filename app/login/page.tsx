'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Button, Form, Container, Card, Spinner } from 'react-bootstrap';
import { FaUtensils, FaKey, FaArrowRight, FaShieldAlt } from 'react-icons/fa';

export default function LoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(adminKey);
    setLoading(false);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#ffffff' }}>
      <Container>
        <div className="d-flex justify-content-center">
          <Card style={{ width: '100%', maxWidth: '480px' }} className="shadow-lg border-0 overflow-hidden">
            {/* Gradient Header */}
            <div style={{ 
              height: '6px', 
              background: 'linear-gradient(90deg, #000 0%, #ff6b35 50%, #ffc107 100%)'
            }}></div>
            
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <div className="mx-auto mb-4 d-flex align-items-center justify-content-center"
                     style={{ 
                       width: '80px', 
                       height: '80px', 
                       background: 'linear-gradient(135deg, #000, #1a1a1a)',
                       borderRadius: '50%',
                       boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                     }}>
                  <FaUtensils size={40} color="#ff6b35" />
                </div>
                <h2 className="fw-bold mb-2" style={{ background: 'linear-gradient(135deg, #000, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Welcome Back
                </h2>
                <p className="text-muted">Enter your admin credentials to continue</p>
              </div>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    <FaShieldAlt className="me-2" size={14} />
                    Admin Security Key
                  </Form.Label>
                  <div className="position-relative">
                    <FaKey className="position-absolute text-muted" style={{ top: '14px', left: '16px', zIndex: 10 }} />
                    <Form.Control
                      type="password"
                      placeholder="Enter your secret admin key"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="py-3 ps-5"
                      style={{ borderRadius: '12px', border: '2px solid #e0e0e0' }}
                      required
                      disabled={loading}
                    />
                  </div>
                </Form.Group>
                
                <Button 
                  type="submit" 
                  variant="dark" 
                  size="lg" 
                  className="w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                  style={{ borderRadius: '12px' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to Dashboard</span>
                      <FaArrowRight />
                    </>
                  )}
                </Button>
              </Form>
              
              <div className="text-center mt-4">
                <p className="text-muted small mb-0">
                  <FaShieldAlt className="me-1" size={12} />
                  Secure admin access only
                </p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}