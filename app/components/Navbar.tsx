'use client';

import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { FaUtensils, FaPlus, FaList, FaSignOutAlt, FaHome, FaChartBar } from 'react-icons/fa';
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
  ];

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" className="shadow-sm sticky-top">
      <Container fluid>
        <BSNavbar.Brand as={Link} href="/" className="d-flex align-items-center gap-2">
          <FaUtensils size={28} color="#ff6b35" />
          <span className="fw-bold fs-4" style={{ background: 'linear-gradient(135deg, #fff, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FoodAdmin
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
                style={{ borderRadius: '10px' }}
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
              style={{ borderRadius: '10px', borderWidth: '2px' }}
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