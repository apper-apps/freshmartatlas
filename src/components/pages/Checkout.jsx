import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CreditCard, Mail, MapPin, Phone, User } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Account from "@/components/pages/Account";
import PaymentMethod from "@/components/molecules/PaymentMethod";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { productService } from "@/services/api/productService";
import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";
import { formatCurrency } from "@/utils/currency";
import { clearCart } from "@/store/cartSlice";

function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, total, clearCart: clearCartItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState(false);
  const [cartValidated, setCartValidated] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    city: '',
    postalCode: '',
    instructions: ''
  });
  const [paymentProof, setPaymentProof] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [errors, setErrors] = useState({});
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [gatewayConfig, setGatewayConfig] = useState({});
  
  // Use items from useCart hook as cart with validation
  const cart = items || [];
  // Calculate totals with validated pricing and deals
  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalSavings = 0;
    
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      // Calculate deal savings
      if (item.dealType && item.dealValue) {
        if (item.dealType === 'BOGO' && item.quantity >= 2) {
          const freeItems = Math.floor(item.quantity / 2);
          totalSavings += freeItems * item.price;
        } else if (item.dealType === 'Bundle' && item.quantity >= 3) {
          const [buyQty, payQty] = item.dealValue.split('for').map(x => parseInt(x.trim()));
          if (buyQty && payQty && item.quantity >= buyQty) {
            const bundleSets = Math.floor(item.quantity / buyQty);
            const freeItems = bundleSets * (buyQty - payQty);
            totalSavings += freeItems * item.price;
          }
        }
      }
    });
    
    const discountedSubtotal = subtotal - totalSavings;
    const deliveryCharge = discountedSubtotal >= 2000 ? 0 : 150;
    
    return {
      originalSubtotal: subtotal,
      dealSavings: totalSavings,
      subtotal: discountedSubtotal,
      deliveryCharge,
      total: discountedSubtotal + deliveryCharge + calculateGatewayFee(discountedSubtotal)
    };
  };

  function calculateGatewayFee(currentSubtotal = 0) {
    const selectedMethod = availablePaymentMethods.find(method => method?.id === paymentMethod);
    if (!selectedMethod || !selectedMethod.fee) return 0;
    
    const feeAmount = typeof selectedMethod.fee === 'number' 
      ? selectedMethod.fee * currentSubtotal 
      : selectedMethod.fee;
    
    return Math.max(feeAmount, selectedMethod.minimumFee || 0);
  }

const totals = calculateCartTotals();
  const { originalSubtotal, dealSavings, subtotal, deliveryCharge, total: finalTotal } = totals;
  const gatewayFee = calculateGatewayFee(subtotal);
  // Validate cart on component mount
  useEffect(() => {
    const validateCart = async () => {
      try {
        // Check if cart exists and has items
        if (!cart || cart.length === 0) {
          console.warn('Checkout accessed with empty cart, redirecting to shopping');
          toast.error('Your cart is empty. Please add items before checkout.');
          navigate('/', { replace: true });
          return;
        }

        // Validate cart items are properly structured
        const invalidItems = cart.filter(item => 
          !item.id || !item.name || !item.price || !item.quantity
        );
        
        if (invalidItems.length > 0) {
          console.warn('Invalid cart items detected:', invalidItems);
          toast.error('Some cart items are invalid. Please refresh your cart.');
          navigate('/cart', { replace: true });
          return;
        }

        // Validate cart total
        if (total <= 0) {
          console.warn('Cart total is zero or negative:', total);
          toast.error('Cart total is invalid. Please check your cart.');
          navigate('/cart', { replace: true });
          return;
        }

        setCartValidated(true);
        loadPaymentMethods();
      } catch (error) {
        console.error('Cart validation error:', error);
        toast.error('Error validating cart. Please try again.');
        navigate('/cart', { replace: true });
      }
    };

    validateCart();
  }, [cart, total, navigate]);

  async function loadPaymentMethods() {
    try {
      const methods = await paymentService.getAvailablePaymentMethods();
      const config = await paymentService.getGatewayConfig();
      const enabledMethods = methods?.filter(method => method?.enabled) || [];
      setAvailablePaymentMethods(enabledMethods);
      setGatewayConfig(config || {});
      
      // Set default payment method to first enabled method
      if (enabledMethods.length > 0) {
        setPaymentMethod(enabledMethods[0].id);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
toast.error('Failed to load payment options');
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, WebP)');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      
      // Clear any previous errors
      if (errors.paymentProof) {
        setErrors(prev => ({
          ...prev,
          paymentProof: ''
        }));
      }
      
      setPaymentProof(file);
      toast.success('Payment proof uploaded successfully');
    }
  }

function removePaymentProof() {
    setPaymentProof(null);
    toast.info('Payment proof removed');
  }
  function validateForm() {
    const newErrors = {};
    const required = ['name', 'phone', 'address', 'city', 'postalCode'];
    
    required.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Validate phone number
    if (formData.phone && !/^03[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid Pakistani phone number (03XXXXXXXXX)';
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate payment proof and transaction ID for non-cash payments
    if (paymentMethod !== 'cash') {
      if (!transactionId.trim()) {
        newErrors.transactionId = 'Transaction ID is required';
      }
      if (!paymentProof) {
        newErrors.paymentProof = 'Payment proof is required';
      }
    }
setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  async function handlePaymentRetry() {
    try {
      setLoading(true);
      const paymentResult = await paymentService.retryPayment(
        'previous_transaction_id',
        { amount: total, orderId: Date.now() }
      );
      return paymentResult;
    } catch (error) {
      toast.error('Payment retry failed: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentVerification(transactionId) {
    try {
      const verificationResult = await paymentService.verifyPayment(transactionId, {
        amount: total,
        orderId: Date.now()
      });
      return verificationResult;
    } catch (error) {
      toast.error('Payment verification failed: ' + error.message);
      throw error;
    }
  }

  // Convert file to base64 for safe serialization
  async function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
async function completeOrder(paymentResult) {
    try {
      let paymentProofData = null;
      
      // Safely convert file to base64 if payment proof exists
      if (paymentProof) {
        try {
          paymentProofData = await convertFileToBase64(paymentProof);
        } catch (fileError) {
          console.warn('Failed to convert payment proof to base64:', fileError);
          toast.warn('Payment proof could not be processed, but order will continue');
        }
      }

      // Validate cart items before order creation
      const validatedItems = [];
      let hasValidationErrors = false;
      
      for (const item of cart) {
        try {
          const currentProduct = await productService.getById(item.id);
          if (!currentProduct) {
            throw new Error(`Product ${item.name} is no longer available`);
          }
          
          validatedItems.push({
            id: item.id,
            name: item.name,
            price: currentProduct.price,
            quantity: item.quantity,
            image: item.image,
            validatedAt: new Date().toISOString()
          });
        } catch (error) {
          toast.error(`Failed to validate ${item.name}`);
          hasValidationErrors = true;
        }
      }
      
      if (hasValidationErrors) {
        throw new Error('Please review cart items and try again');
      }

      // Recalculate totals with validated prices and deals
      let validatedSubtotal = 0;
      let validatedDealSavings = 0;
      
      validatedItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        validatedSubtotal += itemTotal;
        
        // Recalculate deal savings with current validated data
        const originalItem = cart.find(cartItem => cartItem.id === item.id);
        if (originalItem?.dealType && originalItem?.dealValue) {
          if (originalItem.dealType === 'BOGO' && item.quantity >= 2) {
            const freeItems = Math.floor(item.quantity / 2);
            validatedDealSavings += freeItems * item.price;
          } else if (originalItem.dealType === 'Bundle' && item.quantity >= 3) {
            const [buyQty, payQty] = originalItem.dealValue.split('for').map(x => parseInt(x.trim()));
            if (buyQty && payQty && item.quantity >= buyQty) {
              const bundleSets = Math.floor(item.quantity / buyQty);
              const freeItems = bundleSets * (buyQty - payQty);
              validatedDealSavings += freeItems * item.price;
            }
          }
        }
      });
      
      const finalSubtotal = validatedSubtotal - validatedDealSavings;
      const validatedDeliveryCharge = finalSubtotal >= 2000 ? 0 : 150;
      const validatedTotal = finalSubtotal + validatedDeliveryCharge + gatewayFee;

      // Create order data
const orderData = {
        items: validatedItems,
        customerInfo: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        },
        paymentMethod: paymentMethod,
        paymentProof: paymentProofData ? {
          fileName: paymentProof?.name || null,
          fileSize: paymentProof?.size || 0,
          uploadedAt: new Date().toISOString(),
          dataUrl: paymentProofData
        } : null,
        transactionId: transactionId || paymentResult?.transactionId || null,
        // Add paymentResult field for non-cash payments
        paymentResult: paymentMethod !== 'cash' && paymentResult ? {
          transactionId: paymentResult.transactionId,
          reference: paymentResult.reference,
          timestamp: paymentResult.timestamp,
          success: paymentResult.success,
          paymentMethod: paymentMethod,
          amount: validatedTotal
        } : null,
        deliveryAddress: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          instructions: formData.instructions
        },
        status: paymentMethod === 'cash' ? 'confirmed' : 'payment_pending',
        verificationStatus: paymentMethod === 'cash' ? null : 'pending',
        priceValidatedAt: new Date().toISOString(),
        walletTransaction: paymentMethod === 'wallet' && paymentResult ? {
          transactionId: paymentResult.transactionId,
          type: 'order_payment',
          amount: validatedTotal,
          processedAt: paymentResult.timestamp
        } : null
      };

      // Validate orderService availability
      if (!orderService || typeof orderService.create !== 'function') {
        throw new Error('Order service is not properly initialized');
      }

      const order = await orderService.create(orderData);
      
      if (!order) {
        throw new Error('Failed to create order');
      }
      
      // Clear cart after successful order creation
      dispatch(clearCart());
      clearCartItems();
      
      toast.success('Order placed successfully!');
      navigate('/orders');
      
      return order;
    } catch (error) {
      console.error('Order submission error:', error);
      
      // Handle specific error types
      if (error.message.includes('HC is not a constructor') || 
          error.message.includes('not a constructor') ||
          error.message.includes('Service initialization error')) {
        toast.error('Service initialization error. Please refresh the page and try again.');
        setServiceError(true);
        return;
      }
      
      if (error.message.includes('not properly initialized')) {
        toast.error('Order service is unavailable. Please try again later.');
        setServiceError(true);
        return;
      }
      
      toast.error('Failed to create order: ' + error.message);
      throw error;
    }
  }

  async function handleSubmit(e, isRetry = false) {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      setLoading(true);
      let paymentResult = null;

      // Process payment based on admin-managed gateway configuration
      const selectedGateway = availablePaymentMethods.find(method => method?.id === paymentMethod);
      
      if (!selectedGateway || !selectedGateway.enabled) {
        throw new Error(`Payment method ${paymentMethod} is not available`);
      }

      if (paymentMethod === 'card') {
        paymentResult = await paymentService.processCardPayment(
          { 
            cardNumber: '4111111111111111', 
            cvv: '123', 
            expiryDate: '12/25',
            cardholderName: formData.name 
          },
          total,
          Date.now()
        );
      } else if (paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') {
        paymentResult = await paymentService.processDigitalWalletPayment(
          paymentMethod,
          total,
          Date.now(),
          formData.phone
        );
      } else if (paymentMethod === 'wallet') {
        paymentResult = await paymentService.processWalletPayment(total, Date.now());
        
        // Record wallet transaction for order payment
        if (paymentResult?.status === 'completed') {
          await paymentService.recordWalletTransaction({
            type: 'order_payment',
            amount: -total, // Negative because it's a payment (deduction)
            description: `Order payment for ${cart?.length || 0} items`,
            reference: paymentResult.transactionId,
            orderId: Date.now(),
            transactionId: paymentResult.transactionId,
            status: 'completed',
            metadata: {
              itemCount: cart?.length || 0,
              originalAmount: originalSubtotal,
              dealSavings: dealSavings,
              deliveryCharge: deliveryCharge
            }
          });
        }
      } else if (paymentMethod === 'bank') {
        paymentResult = await paymentService.processBankTransfer(
          total,
          Date.now(),
          { accountNumber: '1234567890', bankName: 'Test Bank' }
        );
        
        // Handle verification if required
        if (paymentResult.requiresVerification) {
          const verificationResult = await handlePaymentVerification(paymentResult.transactionId);
          if (!verificationResult.verified) {
            throw new Error('Payment verification failed');
          }
        }
      }

      // Override system-generated transaction ID with user-provided one for non-cash payments
      if (paymentResult && transactionId && paymentMethod !== 'cash') {
        paymentResult.transactionId = transactionId;
      }

      // Complete the order
// Complete the order
      await completeOrder(paymentResult);
      
    } catch (error) {
      console.error('Order submission error:', error);
      // Track error for monitoring
      if (typeof window !== 'undefined' && window.performanceMonitor) {
        window.performanceMonitor.trackError(error, 'checkout-submission');
      }
      
      // Enhanced error handling with specific messaging and recovery
      let errorMessage = 'Order failed: ' + error.message;
      let showRetry = false;
      let retryDelay = 2000;
      let errorType = 'general';
      
      // Comprehensive error classification
      if (error.code === 'WALLET_PAYMENT_FAILED') {
        errorMessage = error.userGuidance || error.message;
        showRetry = error.retryable !== false;
        retryDelay = 3000;
        errorType = 'wallet';
      } else if (error.message.includes('payment')) {
        showRetry = !isRetry;
        errorMessage = `Payment processing failed. ${error.message}`;
        errorType = 'payment';
      } else if (error.message.includes('network') || error.message.includes('connectivity') || error.message.includes('fetch')) {
        showRetry = true;
        errorMessage = 'Network error occurred. Please check your internet connection and try again.';
        errorType = 'network';
      } else if (error.message.includes('timeout') || error.message.includes('deadline')) {
        showRetry = true;
        errorMessage = 'Request timed out. Please try again.';
        errorType = 'timeout';
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        errorMessage = 'Please check your order details and try again.';
        errorType = 'validation';
      } else if (error.message.includes('server') || error.message.includes('500') || error.message.includes('503')) {
        showRetry = true;
        errorMessage = 'Server error occurred. Please try again in a few moments.';
        errorType = 'server';
        retryDelay = 5000;
      }
      
      toast.error(errorMessage, {
        duration: errorType === 'network' ? 6000 : 4000,
        action: showRetry && !isRetry ? {
          label: 'Retry',
          onClick: () => handleSubmit(e, true)
        } : undefined
      });
      
      // Offer retry for applicable errors with enhanced messaging
      if (showRetry && !isRetry) {
        setTimeout(() => {
          let retryMessage;
          
          switch (errorType) {
            case 'wallet':
              retryMessage = `${error.walletType || 'Wallet'} payment failed. Would you like to try again or choose a different payment method?`;
              break;
            case 'network':
              retryMessage = 'Network issue detected. Would you like to retry the order?';
              break;
            case 'timeout':
              retryMessage = 'The request timed out. Would you like to try again?';
              break;
            case 'server':
              retryMessage = 'Server error occurred. Would you like to retry your order?';
              break;
            default:
              retryMessage = 'Order failed. Would you like to retry?';
          }
            
          if (window.confirm(retryMessage)) {
            handleSubmit(e, true);
          }
        }, retryDelay);
      }
    } finally {
setLoading(false);
    }
  }

  // Early returns for loading and error states
  if (loading) return <Loading />;
  if (errors?.general) return <Error message={errors.general} />;
  if (serviceError) {
    return (
      <div className="text-center py-12">
        <Error message="Service is temporarily unavailable. Please refresh the page and try again." />
        <Button onClick={() => window.location.reload()} className="mt-4">
          Refresh Page
        </Button>
      </div>
    );
  }
  
  // Show loading while validating cart
  if (!cartValidated) {
    return <Loading type="page" />;
  }
  
  // Final validation - this should not happen after useEffect validation
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Empty 
              type="cart" 
              title="Your cart is empty"
              description="Add some products to your cart before checkout"
              action="Continue Shopping"
              onAction={() => navigate('/')}
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center mb-8">
          <ApperIcon className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center">
                      <img 
                        src={item.image || item.imageUrl || '/placeholder-image.jpg'} 
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded mr-3"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
<span className="font-semibold">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Original Subtotal:</span>
                    <span>Rs. {originalSubtotal.toLocaleString()}</span>
                  </div>
                  {dealSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center">
                        <ApperIcon name="Gift" size={16} className="mr-1" />
                        Deal Savings:
                      </span>
                      <span>-Rs. {dealSavings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Subtotal after deals:</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>Rs. {deliveryCharge.toLocaleString()}</span>
                  </div>
                  {gatewayFee > 0 && (
                    <div className="flex justify-between">
                      <span>Gateway Fee:</span>
                      <span>Rs. {gatewayFee.toLocaleString()}</span>
</div>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span className="gradient-text">Rs. {finalTotal.toLocaleString()}</span>
                  </div>
                  {dealSavings > 0 && (
                    <div className="text-center py-2 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">
                        🎉 You saved Rs. {dealSavings.toLocaleString()} with deals!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="order-1 lg:order-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Information */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
                <div className="space-y-4">
                  <div>
                    <Input
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      error={errors.name}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      error={errors.phone}
                      placeholder="03XXXXXXXXX"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      error={errors.email}
                    />
                  </div>
                  <div>
                    <Input
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      error={errors.address}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      error={errors.city}
                      required
                    />
                    <Input
                      label="Postal Code"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      error={errors.postalCode}
                      required
                    />
                  </div>
                  <div>
                    <Input
label="Delivery Instructions"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleInputChange}
                      placeholder="Special instructions for delivery..."
                    />
                  </div>
                </div>
              </div>
              {/* Payment Method */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                {availablePaymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <ApperIcon name="CreditCard" size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Loading payment methods...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availablePaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{method.name}</h3>
                                <p className="text-sm text-gray-600">{method.description}</p>
                                {method.fee > 0 && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    Fee: {typeof method.fee === 'number' ? `${(method.fee * 100).toFixed(1)}%` : `PKR ${method.fee}`}
                                    {method.minimumFee && ` (min PKR ${method.minimumFee})`}
                                  </p>
                                )}
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                paymentMethod === method.id
                                  ? 'border-primary bg-primary'
                                  : 'border-gray-300'
                              }`}>
                                {paymentMethod === method.id && (
                                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                )}
                              </div>
                            </div>

                            {/* Account Details for Admin-Configured Gateways */}
                            {paymentMethod === method.id && method.accountNumber && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="space-y-2">
                                  {method.accountName && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-blue-700 font-medium">Account Name:</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-mono text-blue-900">{method.accountName}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(method.accountName);
                                            toast.success('Account name copied!');
                                          }}
                                          className="text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                          <ApperIcon name="Copy" size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-700 font-medium">Account Number:</span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-mono text-blue-900">{method.accountNumber}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(method.accountNumber);
                                          toast.success('Account number copied!');
                                        }}
                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                      >
                                        <ApperIcon name="Copy" size={14} />
                                      </button>
                                    </div>
</div>
                                  {method.instructions && (
                                    <div className="pt-2 border-t border-blue-200">
                                      <p className="text-xs text-blue-700">{method.instructions}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Payment Details for Non-Cash Methods */}
                {paymentMethod !== 'cash' && (
                  <div className="mt-4 space-y-4">
                    {/* Transaction ID Input */}
                    <div>
                      <Input
                        label="Transaction ID"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter your transaction ID"
                        error={errors.transactionId}
                      />
                    </div>

                    {/* Payment Proof Upload for Bank Transfers */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Payment Proof *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="payment-proof-upload"
                        />
                        <label
                          htmlFor="payment-proof-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <ApperIcon name="Upload" size={32} className="text-gray-400" />
                          <div>
                            <span className="text-primary font-medium">Click to upload</span>
                            <span className="text-gray-500"> or drag and drop</span>
                          </div>
                          <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                        </label>
                      </div>
                      {errors.paymentProof && (
                        <p className="mt-1 text-sm text-red-600">{errors.paymentProof}</p>
                      )}
                    </div>
                    
                    {paymentProof && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <ApperIcon name="FileImage" size={20} className="text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                {paymentProof.name}
                              </p>
                              <p className="text-xs text-green-600">
                                {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removePaymentProof}
                            className="text-green-600 hover:text-green-800 transition-colors"
                          >
                            <ApperIcon name="X" size={16} />
                          </button>
                        </div>
                        {paymentProof && (
                          <div className="mt-3">
                            <img
                              src={URL.createObjectURL(paymentProof)}
                              alt="Payment proof preview"
                              className="max-w-full h-32 object-cover rounded-lg border border-green-200"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <ApperIcon name="Info" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Payment Instructions:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Transfer the exact amount using the account details above</li>
                            <li>• Copy the transaction ID and enter it in the field above</li>
                            <li>• Take a clear screenshot of the payment confirmation</li>
                            <li>• Upload the screenshot for verification</li>
<li>• Your order will be processed after payment verification</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="card p-6">
                <Button
type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Processing...' : `Place Order - Rs. ${finalTotal.toLocaleString()}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
</div>
    </div>
  );
}
export default Checkout;