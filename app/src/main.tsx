import './index.css'

import { WebStorageStateStore } from 'oidc-client-ts'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, AuthProviderProps } from "react-oidc-context"
import Router from './Router'

const oidcConfig: AuthProviderProps = {
  authority: 'https://login.microsoftonline.com/common/v2.0',
  client_id: import.meta.env.VITE_CLIENT_ID,
  redirect_uri: window.location.origin,
  scope: 'offline_access openid profile user.read',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
  userStore: new WebStorageStateStore({ store: window.localStorage }),
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <Router />
    </AuthProvider>
  </StrictMode>
)
