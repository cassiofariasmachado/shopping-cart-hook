import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const cartKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(cartKey)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const verifyStock = async (productId: number, amount: number) => {
    const response = await api.get(`stock/${productId}`);
    const stock = response.data as Stock;

    if (amount > stock.amount) {
      toast.error('Quantidade solicitada fora de estoque');
      return true;
    }

    return false;
  }

  const getProduct = async (productId: number): Promise<Product | undefined> => {
    const product = cart.find(p => p.id === productId)

    if (!product) {
      const response = await api.get(`products/${productId}`);
      if (!response) return undefined;

      return { ...response.data, amount: 1 };
    }

    return { ...product, amount: product.amount + 1 };
  }

  const addProduct = async (productId: number) => {
    try {
      const product = await getProduct(productId);

      if (!product) return;

      if (await verifyStock(productId, product.amount)) return;

      const newCart = [
        ...cart.filter(p => p.id !== product.id),
        product
      ];

      setCart(newCart);
      saveCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const saveCart = (products: Product[]) => {
    localStorage.setItem(cartKey, JSON.stringify(products));
  }

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);

      if (!product) {
        toast.error('Erro na remoção do produto');
        return;
      }


      const cartWithoutItem = cart.filter(item => item.id !== productId);

      saveCart(cartWithoutItem);
      setCart(cartWithoutItem);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      if (await verifyStock(productId, amount)) return;

      const product = cart.find(item => item.id === productId);

      if (!product) return;

      const productWithNewAmount = { ...product, amount: amount };
      const cartWithoutItem = cart.filter(item => item.id !== productId);

      const newCart = [...cartWithoutItem, productWithNewAmount];

      setCart(newCart);
      saveCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
