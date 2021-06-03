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

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');  
    if (storagedCart) {
     return JSON.parse(storagedCart);
   }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //transfere todo o cart, para nao modifica-lo diretamente
      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId)

      //pega os dados da api com base no id passado como parametro na url
      const stock = await api.get(`stock/${productId}`);
      //pega o amount de dentro de stock
      const stockAmount = stock.data.amount;
      //pega quantidade atual
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1 ;

      //verifica a quantidade disponivel
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      //caso exista faz um update na variavel updateProduct que e uma copia do cart
      if(productExists) {
        productExists.amount = amount;
      }else{
        const product = await api.get(`products/${productId}`);
        const newPoduct = {
          ...product.data,
          amount: 1
        }
        updateCart.push(newPoduct);
      }

      //tranfere as modificacoes para o cart
      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(productId){
        const updateCart = [...cart];
        const productIndex = updateCart.findIndex(product => product.id === productId);
        //o finde index quando ele n encontra retorna -1 se acha fica > 0

        if(productIndex >= 0){
          updateCart.splice(productIndex, 1);
          setCart(updateCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
        }else{
          throw Error(); //forca o erro
        }
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId)

      if(productExists){
        productExists.amount = amount;
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      }else{
        throw Error();
      }   
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
