'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaUtensils, FaSave, FaTimes } from 'react-icons/fa';
import { db } from '../lib/firebase';
import { ref, get, push, remove, update, set } from 'firebase/database';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { Category } from '../types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const snapshot = await get(ref(db, 'categories'));
      const data: Category[] = [];
      snapshot.forEach((child) => {
        data.push({ 
          id: child.key, 
          ...child.val(),
          // Ensure id is also stored inside the object if you want it as a field
          categoryId: child.key 
        });
      });
      setCategories(data.reverse());
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error('Please enter category name');
      return;
    }
    
    setLoading(true);
    
    try {
      const categoryId = Date.now().toString(); // Generate custom ID
      
      const categoryData = {
        id: editingCategory?.id || categoryId, // Store ID as field
        name: categoryName.trim(),
        createdAt: Date.now()
      };
      
      if (editingCategory?.id) {
        // Update existing category
        await update(ref(db, `categories/${editingCategory.id}`), categoryData);
        toast.success('Category updated successfully');
      } else {
        // Create new category with custom ID
        await set(ref(db, `categories/${categoryId}`), categoryData);
        toast.success('Category created successfully');
      }
      
      resetModal();
      fetchCategories();
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? Food items in this category will still exist but category will be removed.')) {
      try {
        await remove(ref(db, `categories/${id}`));
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error) {
        toast.error('Failed to delete category');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowModal(true);
  };

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>Categories Management</h2>
              <p className="text-muted">Manage your food categories</p>
            </div>
            <Button 
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center gap-2 px-4 py-2"
              style={{ 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6b0c12, #8f1018)',
                border: 'none'
              }}
            >
              <FaPlus size={16} />
              Add Category
            </Button>
          </div>

          {/* Categories Grid */}
          {categories.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Body>
                <FaUtensils size={60} className="text-muted mb-3" />
                <h5 className="text-muted">No categories yet</h5>
                <p className="text-muted">Click the button above to add your first category</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {categories.map((category) => (
                <Col key={category.id} md={6} lg={4} xl={3}>
                  <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '20px', transition: 'all 0.3s' }}>
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{ 
                            width: '50px', 
                            height: '50px', 
                            background: 'linear-gradient(135deg, #6b0c12, #b3141e)',
                            boxShadow: '0 4px 15px rgba(107, 12, 18, 0.3)'
                          }}
                        >
                          <FaUtensils size={24} color="#fff" />
                        </div>
                        <div className="d-flex gap-2">
                          <Button 
                            variant="outline-dark" 
                            size="sm" 
                            onClick={() => editCategory(category)}
                            style={{ borderRadius: '10px' }}
                          >
                            <FaEdit size={14} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDelete(category.id!)}
                            style={{ borderRadius: '10px' }}
                          >
                            <FaTrash size={14} />
                          </Button>
                        </div>
                      </div>
                      <h5 className="fw-bold mb-2" style={{ color: '#6b0c12' }}>{category.name}</h5>
                      <div className="mt-2">
                        <Badge bg="light" text="dark" className="px-3 py-2 me-2">
                          ID: {category.id?.slice(-8)}
                        </Badge>
                        <Badge bg="light" text="dark" className="px-3 py-2">
                          {new Date(category.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </div>

      {/* Add/Edit Category Modal */}
      <Modal show={showModal} onHide={resetModal} centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold" style={{ color: '#6b0c12' }}>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 pb-4">
            <Form.Group>
              <Form.Label className="fw-semibold" style={{ color: '#6b0c12' }}>Category Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Pizza, Burgers, Drinks, Desserts"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="py-3"
                style={{ 
                  borderRadius: '12px', 
                  border: '2px solid #e0e0e0',
                  borderColor: '#6b0c12'
                }}
                required
                autoFocus
              />
              <Form.Text className="text-muted">
                Choose a clear and descriptive name for your category
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pb-4 px-4">
            <Button 
              variant="light" 
              onClick={resetModal}
              className="px-4"
              style={{ borderRadius: '10px' }}
            >
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
              {loading ? (
                <>Saving...</>
              ) : (
                <>
                  <FaSave size={16} />
                  {editingCategory ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}