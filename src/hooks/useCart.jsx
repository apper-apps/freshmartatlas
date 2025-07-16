import { useSelector, useDispatch } from 'react-redux';
import { 
  addToCart as addToCartAction, 
  removeFromCart as removeFromCartAction, 
  updateQuantity as updateQuantityAction, 
  clearCart as clearCartAction,
  setLoading,
  selectCartItems,
  selectCartTotal,
  selectCartItemCount,
  selectCartLoading,
  selectIsProductInCart,
  selectProductQuantityInCart
} from '@/store/cartSlice';

export const useCart = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const cart = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartItemCount);
  const isLoading = useSelector(selectCartLoading);

  // Actions with loading states
  const addToCart = (product) => {
    dispatch(setLoading(true));
    setTimeout(() => {
      dispatch(addToCartAction(product));
      dispatch(setLoading(false));
    }, 200);
  };

  const removeFromCart = (productId) => {
    dispatch(removeFromCartAction(productId));
  };

  const updateQuantity = (productId, quantity) => {
    dispatch(updateQuantityAction({ productId, quantity }));
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  // Helper functions that use selectors
  const getCartTotal = () => cartTotal;
  const getCartCount = () => cartCount;
  const getCartItems = () => cart;
  
// These functions should be used within components, not as utilities
  // They are kept here for compatibility but should be called from within React components
  const isProductInCart = (productId) => {
    // This function should be called from within a React component
    // Example: const isInCart = useSelector(selectIsProductInCart(productId));
    console.warn('isProductInCart should be called from within a React component');
    return false;
  };
  
  const getProductQuantityInCart = (productId) => {
    // This function should be called from within a React component
    // Example: const quantity = useSelector(selectProductQuantityInCart(productId));
    console.warn('getProductQuantityInCart should be called from within a React component');
    return 0;
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getCartItems,
    isProductInCart,
    getProductQuantityInCart,
    isLoading
  };
};