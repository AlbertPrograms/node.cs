import { useState } from 'react';

export interface UserToken {
  token: string;
}

const useToken = (): [string, (token: UserToken) => void] => {
  const getToken = (): string => {
    const tokenString = localStorage.getItem('token');
    const userToken: UserToken = tokenString
      ? JSON.parse(tokenString)
      : null;
    return userToken?.token;
  };

  const [token, setToken] = useState<string>(getToken());

  const saveToken = (token: UserToken): void => {
    localStorage.setItem('token', JSON.stringify(token));
    setToken(token.token);
  };

  return [token, saveToken];
};

export default useToken;
