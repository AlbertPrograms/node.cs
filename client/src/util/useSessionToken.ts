import { useState } from 'react';

export type SessionTokenString = string;

const useSessionToken = (): [string, (token: SessionTokenString) => void] => {
  const getToken = (): string => {
    const tokenString = localStorage.getItem('token');
    const userToken: SessionTokenString = tokenString
      ? JSON.parse(tokenString)
      : null;
    return userToken;
  };

  const [token, setToken] = useState<string>(getToken());

  const saveToken = (token: SessionTokenString): void => {
    localStorage.setItem('token', JSON.stringify(token));
    setToken(token);
  };

  return [token, saveToken];
};

export default useSessionToken;
