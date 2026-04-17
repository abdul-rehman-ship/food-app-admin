'use client';

import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { FaUtensils, FaList, FaSignOutAlt, FaHome, FaCog, FaTruck } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: FaHome, label: 'Dashboard' },
    { href: '/food-items', icon: FaUtensils, label: 'Food Items' },
    { href: '/categories', icon: FaList, label: 'Categories' },
    { href: '/trailors', icon: FaTruck, label: 'Trailors' },
    { href: '/settings', icon: FaCog, label: 'Settings' },
  ];

  return (
    <BSNavbar expand="lg" className="custom-navbar shadow-sm sticky-top" style={{ background: '#000000' }}>
      <Container fluid>
        <BSNavbar.Brand as={Link} href="/" className="d-flex align-items-center gap-2">
          <FaUtensils size={28} color="#6b0c12" />
          <span className="fw-bold fs-4" style={{ 
            background: 'linear-gradient(135deg, #ffffff, #6b0c12)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Bertha's Food Admin
          </span>
        </BSNavbar.Brand>
        
        <BSNavbar.Toggle aria-controls="navbar-nav" />
        
        <BSNavbar.Collapse id="navbar-nav">
          <Nav className="ms-auto d-flex align-items-center gap-2">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Nav.Link 
                key={href} 
                as={Link} 
                href={href}
                className={`d-flex align-items-center gap-2 px-3 py-2 ${pathname === href ? 'active' : ''}`}
                style={{ 
                  borderRadius: '10px',
                  color: '#ffffff',
                  transition: 'all 0.3s ease'
                }}
              >
                <Icon size={18} />
                {label}
              </Nav.Link>
            ))}
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={logout}
              className="d-flex align-items-center gap-2 ms-2 px-3 py-2"
              style={{ 
                borderRadius: '10px', 
                borderWidth: '2px',
                borderColor: '#6b0c12',
                color: '#ffffff'
              }}
            >
              <FaSignOutAlt size={16} />
              Logout
            </Button>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}