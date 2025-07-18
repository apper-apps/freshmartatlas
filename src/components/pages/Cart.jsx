import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/currency";
import { selectCartItemCount, selectCartItems, selectCartTotal, validateCartPrices, clearCart } from "@/store/cartSlice";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Empty from "@/components/ui/Empty";
import Checkout from "@/components/pages/Checkout";
import CartItem from "@/components/molecules/CartItem";

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartItemCount);

  // Validate cart prices on component mount
useEffect(() => {
    if (cart.length > 0) {
      try {
        dispatch(validateCartPrices());
      } catch (error) {
        console.error('Error validating cart prices:', error);
        // Continue without blocking the UI
      }
    }
  }, [dispatch, cart.length]);
// Early return for empty cart with enhanced validation
  if (!cart || cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Empty 
          type="cart" 
          onAction={() => {
            try {
              navigate('/category/All');
            } catch (error) {
              console.error('Navigation error:', error);
              window.location.href = '/category/All';
            }
          }}
        />
      </div>
    );
  }

// Use validated cart total for accurate calculations
  const subtotal = cartTotal;
  const deliveryCharge = subtotal >= 2000 ? 0 : 150; // Free delivery over Rs. 2000
  const total = subtotal + deliveryCharge;
return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      {/* Mobile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        
        <button
          onClick={() => dispatch(clearCart())}
          className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors text-sm sm:text-base"
        >
          <ApperIcon name="Trash2" size={18} />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Mobile-first responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items - Stacked on mobile */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {cart.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
          
          {/* Continue Shopping - Mobile optimized */}
          <div className="border-t border-gray-200 pt-4">
            <Link 
              to="/category/All"
              className="inline-flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors text-sm sm:text-base"
            >
              <ApperIcon name="ArrowLeft" size={18} />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary - Fixed on mobile */}
        <div className="lg:col-span-1">
          <div className="card p-4 sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Order Summary</h2>
            
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Subtotal ({cartCount} items)</span>
                <span className="font-medium text-sm sm:text-base transition-all duration-300">Rs. {subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Delivery Charge</span>
                <span className="font-medium text-sm sm:text-base">
                  {deliveryCharge > 0 ? `Rs. ${deliveryCharge.toLocaleString()}` : 'Free'}
                </span>
              </div>
              
              {subtotal >= 2000 && deliveryCharge === 150 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-xs sm:text-sm">Free delivery bonus!</span>
                  <span className="text-xs sm:text-sm font-medium">-Rs. 150</span>
                </div>
              )}
              
              {subtotal >= 2000 && deliveryCharge === 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-xs sm:text-sm">🎉 Free delivery applied!</span>
                  <span className="text-xs sm:text-sm font-medium">Rs. 0</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3 sm:pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl sm:text-2xl font-bold gradient-text transition-all duration-300">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              icon="CreditCard"
              onClick={() => navigate('/checkout')}
              className="w-full mb-4 text-sm sm:text-base py-3 sm:py-4"
            >
              Proceed to Checkout
            </Button>

            {/* Trust Badges - Responsive */}
            <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="Shield" size={14} className="text-green-600" />
                <span>Secure checkout</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="Truck" size={14} className="text-blue-600" />
                <span>Fast delivery</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ApperIcon name="RotateCcw" size={14} className="text-purple-600" />
                <span>Easy returns</span>
              </div>
            </div>

            {/* Payment Methods - Mobile optimized */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">We accept:</p>
              <div className="flex flex-wrap gap-2">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded">
                  JazzCash
                </div>
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded">
                  EasyPaisa
                </div>
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs px-2 py-1 rounded">
                  COD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom checkout bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-lg gradient-text">Rs. {total.toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </div>
        </div>
        <Button
          variant="primary"
          size="large"
          icon="CreditCard"
          onClick={() => navigate('/checkout')}
          className="w-full"
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;
// Show cart content or empty state
  // (Empty state is handled in the return JSX)