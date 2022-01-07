import { useState } from 'react';

export type TokenString = string;

const useToken = (tokenKind: string): [string, (token: TokenString) => void] => {
  const tokenName = `${tokenKind}Token`;

  const getToken = (): string => {
    const tokenString = localStorage.getItem(tokenName);
    const userToken: TokenString = tokenString
      ? JSON.parse(tokenString)
      : null;
    return userToken;
  };

  const [token, setToken] = useState<string>(getToken());

  const saveToken = (token: TokenString): void => {
    localStorage.setItem(tokenName, JSON.stringify(token));
    setToken(token);
  };

  return [token, saveToken];
};

export default useToken;
