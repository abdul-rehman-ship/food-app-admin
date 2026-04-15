'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Image, Badge } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaUpload, FaTimes, FaSearch, FaFilter, FaUtensils, FaSave, FaEye } from 'react-icons/fa';
import { db, storage } from '../lib/firebase';
import { ref, get, push, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import type { FoodItem, Category, Size } from '../types';

const PREDEFINED_SIZES = ['Small', 'Medium', 'Large'];

export default function FoodItemsPage() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    ingredients: [] as string[],
    stock: '',
    sizes: [] as Size[],
    categoryId: '',
    images: [] as string[]
  });
  const [newIngredient, setNewIngredient] = useState('');
  const [sizePrices, setSizePrices] = useState({
    Small: '',
    Medium: '',
    Large: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchTerm, selectedCategory, foodItems]);

  const fetchData = async () => {
    try {
      const [foodSnapshot, catSnapshot] = await Promise.all([
        get(ref(db, 'food_items')),
        get(ref(db, 'categories'))
      ]);
      
      const foodData: FoodItem[] = [];
      foodSnapshot.forEach((child) => {
        foodData.push({ id: child.key, ...child.val() });
      });
      
      const catData: Category[] = [];
      catSnapshot.forEach((child) => {
        catData.push({ id: child.key, ...child.val() });
      });
      
      setFoodItems(foodData.reverse());
      setFilteredItems(foodData.reverse());
      setCategories(catData);
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const filterItems = () => {
    let filtered = [...foodItems];
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.categoryId === selectedCategory);
    }
    
    setFilteredItems(filtered);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (formData.images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const imageId = Date.now() + Math.random().toString(36);
      const imageRef = storageRef(storage, `food_images/${imageId}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      uploadedUrls.push(url);
    }
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...uploadedUrls]
    }));
    setUploadingImages(false);
    toast.success(`${files.length} image(s) uploaded`);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    toast.success('Image removed');
  };

  const addIngredient = () => {
    if (newIngredient.trim() && !formData.ingredients.includes(newIngredient.trim())) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient.trim()]
      }));
      setNewIngredient('');
    }
  };

  const removeIngredient = (ingredientToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i !== ingredientToRemove)
    }));
  };

  const handleSizePriceChange = (size: string, price: string) => {
    setSizePrices(prev => ({ ...prev, [size]: price }));
  };

  const addSizes = () => {
    const selectedSizes: Size[] = [];
    
    if (sizePrices.Small && parseFloat(sizePrices.Small) > 0) {
      selectedSizes.push({ name: 'Small', price: parseFloat(sizePrices.Small) });
    }
    if (sizePrices.Medium && parseFloat(sizePrices.Medium) > 0) {
      selectedSizes.push({ name: 'Medium', price: parseFloat(sizePrices.Medium) });
    }
    if (sizePrices.Large && parseFloat(sizePrices.Large) > 0) {
      selectedSizes.push({ name: 'Large', price: parseFloat(sizePrices.Large) });
    }
    
    setFormData(prev => ({ ...prev, sizes: selectedSizes }));
  };

  const removeSize = (sizeName: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter(s => s.name !== sizeName)
    }));
    setSizePrices(prev => ({ ...prev, [sizeName]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.price || !formData.description || !formData.stock || !formData.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (formData.images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    
    setLoading(true);
    
    try {
      const itemData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        ingredients: formData.ingredients,
        stock: parseInt(formData.stock),
        sizes: formData.sizes,
        images: formData.images,
        categoryId: formData.categoryId,
        createdAt: Date.now()
      };
      
      if (editingItem?.id) {
        await update(ref(db, `food_items/${editingItem.id}`), itemData);
        toast.success('Food item updated successfully');
      } else {
        await push(ref(db, 'food_items'), itemData);
        toast.success('Food item created successfully');
      }
      
      resetModal();
      fetchData();
    } catch (error) {
      toast.error('Failed to save food item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, images: string[]) => {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        for (const imageUrl of images) {
          try {
            const imageRef = storageRef(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
        
        await remove(ref(db, `food_items/${id}`));
        toast.success('Food item deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete food item');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      description: '',
      ingredients: [],
      stock: '',
      sizes: [],
      categoryId: '',
      images: []
    });
    setSizePrices({ Small: '', Medium: '', Large: '' });
    setNewIngredient('');
  };

  const editItem = (item: FoodItem) => {
    setEditingItem(item);
    
    // Populate size prices for editing
    const sizePriceMap = { Small: '', Medium: '', Large: '' };
    item.sizes?.forEach(size => {
      if (size.name === 'Small') sizePriceMap.Small = size.price.toString();
      if (size.name === 'Medium') sizePriceMap.Medium = size.price.toString();
      if (size.name === 'Large') sizePriceMap.Large = size.price.toString();
    });
    
    setSizePrices(sizePriceMap);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      description: item.description,
      ingredients: item.ingredients || [],
      stock: item.stock.toString(),
      sizes: item.sizes || [],
      categoryId: item.categoryId,
      images: item.images || []
    });
    setShowModal(true);
  };

  const viewDetails = (item: FoodItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <>
      <Navbar />
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Container className="py-5">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="fw-bold mb-2" style={{ color: '#000' }}>Food Items Management</h2>
              <p className="text-muted">Manage your menu items</p>
            </div>
            <Button 
              variant="dark" 
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center gap-2 px-4 py-2"
              style={{ borderRadius: '12px' }}
            >
              <FaPlus size={16} />
              Add Food Item
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
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-3 ps-5"
                    style={{ borderRadius: '12px', border: '2px solid #e0e0e0' }}
                  />
                </div>
              </Col>
              <Col md={4}>
                <div className="position-relative">
                  <FaFilter className="position-absolute text-muted" style={{ top: '14px', left: '16px' }} />
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-3 ps-5"
                    style={{ borderRadius: '12px', border: '2px solid #e0e0e0' }}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Form.Select>
                </div>
              </Col>
            </Row>
          </div>

          {/* Food Items Grid */}
          {filteredItems.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Body>
                <FaUtensils size={60} className="text-muted mb-3" />
                <h5 className="text-muted">No food items found</h5>
                <p className="text-muted">Click the button above to add your first food item</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {filteredItems.map((item) => (
                <Col key={item.id} md={6} lg={4} xl={3}>
                  <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '20px', overflow: 'hidden', transition: 'all 0.3s' }}>
                    {item.images && item.images.length > 0 ? (
                      <div style={{ height: '200px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => viewDetails(item)}>
                        <Image 
                          src={item.images[0]} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '200px', background: '#f0f0f0', cursor: 'pointer' }} 
                           className="d-flex align-items-center justify-content-center"
                           onClick={() => viewDetails(item)}>
                        <FaUtensils size={48} className="text-muted" />
                      </div>
                    )}
                    
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="fw-bold mb-0" style={{ color: '#000', cursor: 'pointer' }} 
                            onClick={() => viewDetails(item)}>
                          {item.name}
                        </h5>
                        <Badge bg="dark" className="px-3 py-2">${item.price}</Badge>
                      </div>
                      
                      <Badge bg="secondary" className="mb-2 px-3 py-2">
                        {getCategoryName(item.categoryId)}
                      </Badge>
                      
                      <p className="text-muted small mb-3">
                        {item.description.substring(0, 80)}...
                      </p>
                      
                      <div className="mb-2">
                        <Badge bg="light" text="dark" className="me-2 px-3 py-2">
                          Stock: {item.stock}
                        </Badge>
                        {item.sizes && item.sizes.length > 0 && (
                          <Badge bg="light" text="dark" className="px-3 py-2">
                            {item.sizes.length} size(s)
                          </Badge>
                        )}
                      </div>
                    </Card.Body>
                    
                    <Card.Footer className="bg-white border-0 pb-4 px-4">
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-dark" 
                          size="sm" 
                          onClick={() => editItem(item)}
                          className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: '10px' }}
                        >
                          <FaEdit size={14} /> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(item.id!, item.images)}
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

      {/* Add/Edit Food Item Modal */}
      <Modal show={showModal} onHide={resetModal} size="lg" centered>
        <Modal.Header closeButton className="border-0 pt-4 px-4">
          <Modal.Title className="fw-bold">
            {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 pb-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Required Fields Section */}
            <div className="mb-4 pb-2 border-bottom">
              <h6 className="fw-bold mb-3" style={{ color: '#ff6b35' }}>Required Information</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Item Name *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., Margherita Pizza"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Base Price *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Describe your food item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  required
                />
              </Form.Group>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Stock Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Category *</Form.Label>
                    <Form.Select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Images - Compulsory */}
            <div className="mb-4 pb-2 border-bottom">
              <h6 className="fw-bold mb-3" style={{ color: '#ff6b35' }}>
                Images * {formData.images.length === 0 && <span className="text-danger">(At least 1 image required)</span>}
              </h6>
              <div className="border rounded p-3" style={{ borderRadius: '12px', border: `2px dashed ${formData.images.length === 0 ? '#dc3545' : '#e0e0e0'}` }}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages || formData.images.length >= 5}
                  className="mb-3"
                />
                {uploadingImages && <p className="text-muted">Uploading...</p>}
                <div className="d-flex flex-wrap gap-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="position-relative">
                      <Image 
                        src={img} 
                        width={80} 
                        height={80} 
                        style={{ objectFit: 'cover', borderRadius: '10px' }} 
                      />
                      <FaTimes
                        className="position-absolute bg-danger text-white rounded-circle p-1"
                        style={{ 
                          top: '-8px', 
                          right: '-8px', 
                          cursor: 'pointer',
                          fontSize: '18px'
                        }}
                        onClick={() => removeImage(idx)}
                      />
                    </div>
                  ))}
                </div>
                {formData.images.length === 0 && (
                  <p className="text-danger text-center mb-0 small">Please upload at least one image</p>
                )}
              </div>
            </div>

            {/* Ingredients - Optional with Add Button */}
            <div className="mb-4 pb-2 border-bottom">
              <h6 className="fw-bold mb-3">Ingredients (Optional)</h6>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  type="text"
                  placeholder="e.g., Fresh Tomatoes"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                  onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                />
                <Button type="button" variant="outline-dark" onClick={addIngredient} style={{ borderRadius: '10px' }}>
                  Add
                </Button>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {formData.ingredients.map((ingredient, idx) => (
                  <Badge key={idx} bg="dark" className="p-2 d-flex align-items-center gap-2">
                    {ingredient}
                    <FaTimes style={{ cursor: 'pointer' }} onClick={() => removeIngredient(ingredient)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sizes with Predefined Names - Admin Only Enters Prices */}
            <div className="mb-3">
              <h6 className="fw-bold mb-3">Sizes with Different Prices (Optional)</h6>
              <p className="text-muted small mb-3">Add prices for sizes you want to offer. Leave empty if size is not available.</p>
              
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Small</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="Price (e.g., 5.99)"
                      value={sizePrices.Small}
                      onChange={(e) => handleSizePriceChange('Small', e.target.value)}
                      onBlur={addSizes}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Medium</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="Price (e.g., 7.99)"
                      value={sizePrices.Medium}
                      onChange={(e) => handleSizePriceChange('Medium', e.target.value)}
                      onBlur={addSizes}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Large</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      placeholder="Price (e.g., 9.99)"
                      value={sizePrices.Large}
                      onChange={(e) => handleSizePriceChange('Large', e.target.value)}
                      onBlur={addSizes}
                      style={{ borderRadius: '10px', border: '2px solid #e0e0e0' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              {/* Display Added Sizes */}
              {formData.sizes.length > 0 && (
                <div className="mt-3">
                  <Form.Label className="fw-semibold">Added Sizes:</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {formData.sizes.map((size, idx) => (
                      <Badge key={idx} bg="dark" className="p-2 d-flex align-items-center gap-2">
                        {size.name}: ${size.price}
                        <FaTimes style={{ cursor: 'pointer' }} onClick={() => removeSize(size.name)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              variant="dark" 
              disabled={loading || formData.images.length === 0}
              className="px-4 d-flex align-items-center gap-2"
              style={{ borderRadius: '10px' }}
            >
              {loading ? (
                <>Saving...</>
              ) : (
                <>
                  <FaSave size={16} />
                  {editingItem ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Product Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        {selectedItem && (
          <>
            <Modal.Header closeButton className="border-0 pt-4 px-4">
              <Modal.Title className="fw-bold">{selectedItem.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 pb-4">
              {/* Images Gallery */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold text-muted mb-3">Images</h6>
                  <Row className="g-2">
                    {selectedItem.images.map((img, idx) => (
                      <Col key={idx} xs={6} md={3}>
                        <Image 
                          src={img} 
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px' }}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
              
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="fw-bold text-muted">Base Price</h6>
                  <h4 className="fw-bold" style={{ color: '#ff6b35' }}>${selectedItem.price}</h4>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold text-muted">Stock</h6>
                  <Badge bg={selectedItem.stock < 10 ? 'danger' : 'dark'} className="px-3 py-2">
                    {selectedItem.stock} units available
                  </Badge>
                </Col>
              </Row>
              
              <div className="mb-3">
                <h6 className="fw-bold text-muted">Category</h6>
                <Badge bg="secondary" className="px-3 py-2">
                  {getCategoryName(selectedItem.categoryId)}
                </Badge>
              </div>
              
              <div className="mb-3">
                <h6 className="fw-bold text-muted">Description</h6>
                <p className="text-muted">{selectedItem.description}</p>
              </div>
              
              {selectedItem.ingredients && selectedItem.ingredients.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold text-muted">Ingredients</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedItem.ingredients.map((ing, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="px-3 py-2">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedItem.sizes && selectedItem.sizes.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold text-muted">Available Sizes & Prices</h6>
                  <Row className="g-2">
                    {selectedItem.sizes.map((size, idx) => (
                      <Col key={idx} xs={6} md={4}>
                        <Card className="border-0 shadow-sm">
                          <Card.Body className="p-3 text-center">
                            <h6 className="fw-bold mb-1">{size.name}</h6>
                            <Badge bg="dark">${size.price}</Badge>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="border-0 pb-4 px-4">
              <Button 
                variant="dark" 
                onClick={() => setShowDetailModal(false)}
                className="px-4"
                style={{ borderRadius: '10px' }}
              >
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
}