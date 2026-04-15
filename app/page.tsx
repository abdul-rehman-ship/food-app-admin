'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaUtensils, FaList, FaDollarSign, FaBoxes, FaPlusCircle, FaChartLine } from 'react-icons/fa';
import { db } from './lib/firebase';
import { ref, get } from 'firebase/database';
import Navbar from './components/Navbar';
import Link from 'next/link';

interface Stats {
  totalItems: number;
  totalCategories: number;
  totalValue: number;
  lowStock: number;
}

interface FoodItem {
  price: number;
  stock: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalCategories: 0,
    totalValue: 0,
    lowStock: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [foodSnapshot, catSnapshot] = await Promise.all([
      get(ref(db, 'food_items')),
      get(ref(db, 'categories'))
    ]);
    
    const items: FoodItem[] = [];
    foodSnapshot.forEach((child) => {
      const val = child.val() as FoodItem;
      if (val) items.push(val);
    });
    
    const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);
    const lowStock = items.filter(item => (item.stock || 0) < 10).length;
    
    setStats({
      totalItems: items.length,
      totalCategories: catSnapshot.size,
      totalValue,
      lowStock
    });
  };

  const statCards = [
    { title: 'Total Food Items', value: stats.totalItems, icon: FaUtensils, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', bg: '#667eea' },
    { title: 'Categories', value: stats.totalCategories, icon: FaList, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff', bg: '#f5576c' },
    { title: 'Inventory Value', value: `$${stats.totalValue.toFixed(2)}`, icon: FaDollarSign, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#fff', bg: '#4facfe' },
    { title: 'Low Stock Items', value: stats.lowStock, icon: FaBoxes, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#fff', bg: '#fa709a' }
  ];

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="display-5 fw-bold mb-3" style={{ background: 'linear-gradient(135deg, #000, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Dashboard Overview
                </h2>
                <p className="text-muted fs-5">Welcome back! Here's what's happening with your food business today.</p>
              </div>
              <div className="d-none d-md-block">
                <FaChartLine size={48} color="#ff6b35" opacity={0.3} />
              </div>
            </div>
          </div>
          
          <Row className="g-4 mb-5">
            {statCards.map((card, idx) => (
              <Col key={idx} md={6} lg={3}>
                <Card className="border-0 h-100 overflow-hidden shadow-sm" style={{ borderRadius: '20px' }}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 fw-semibold">{card.title}</p>
                        <h3 className="fw-bold mb-0" style={{ fontSize: '2rem', color: '#000' }}>{card.value}</h3>
                      </div>
                      <div style={{ 
                        background: card.gradient, 
                        padding: '14px', 
                        borderRadius: '16px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                      }}>
                        <card.icon size={28} color="#fff" />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          
          <Row>
            <Col lg={8}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Header className="bg-white border-0 pt-4 px-4">
                  <h4 className="fw-bold mb-0" style={{ color: '#000' }}>Quick Actions</h4>
                </Card.Header>
                <Card.Body className="px-4 pb-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Link href="/food-items" style={{ textDecoration: 'none' }}>
                        <div className="p-4 rounded-3" style={{ background: '#f8f9fa', transition: 'all 0.3s', cursor: 'pointer', border: '1px solid #e0e0e0' }}>
                          <FaPlusCircle size={32} className="mb-3" style={{ color: '#ff6b35' }} />
                          <h5 className="fw-bold mb-1" style={{ color: '#000' }}>Add Food Item</h5>
                          <p className="text-muted small mb-2">Create new menu items with images</p>
                          <span className="small fw-semibold" style={{ color: '#ff6b35' }}>Get Started →</span>
                        </div>
                      </Link>
                    </Col>
                    <Col md={6}>
                      <Link href="/categories" style={{ textDecoration: 'none' }}>
                        <div className="p-4 rounded-3" style={{ background: '#f8f9fa', transition: 'all 0.3s', cursor: 'pointer', border: '1px solid #e0e0e0' }}>
                          <FaList size={32} className="mb-3" style={{ color: '#ff6b35' }} />
                          <h5 className="fw-bold mb-1" style={{ color: '#000' }}>Manage Categories</h5>
                          <p className="text-muted small mb-2">Organize your food categories</p>
                          <span className="small fw-semibold" style={{ color: '#ff6b35' }}>Get Started →</span>
                        </div>
                      </Link>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
           
          </Row>
        </Container>
      </div>
    </>
  );
}