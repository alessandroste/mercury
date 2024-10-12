import { useEffect, useMemo } from "react"
import { useAuth } from "react-oidc-context"
import { createBrowserRouter, LoaderFunctionArgs, RouterProvider } from "react-router-dom"
import App from "./App"
import { JMapClientContext } from "./JMapClientContext"
import { Email } from "./model/Email"
import Compose from "./pages/Compose"
import Mailbox from "./pages/Mailbox"
import Message from "./pages/Message"
import JMapClient, { Accounts, PARAM_ACCOUNT, PARAM_MESSAGE } from "./services/JMapClient"

export interface IComposeData {
  accounts: Accounts,
  email?: Email
}

async function getComposeData(client: JMapClient, args: LoaderFunctionArgs)
: Promise<IComposeData> {
  const queryParams = new URL(args.request.url).searchParams
  const account = queryParams.get(PARAM_ACCOUNT)
  const message = queryParams.get(PARAM_MESSAGE)
  const email = account && message ?
    await client.getEmail({'aid': account,'mid': message}) :
    undefined

  return {
    accounts: await client.getAccounts(),
    email: email ?? undefined
  }
}

export default function Router() {
  const { user, isAuthenticated, signinSilent } = useAuth()
  const client = useMemo(() => {
    return new JMapClient(isAuthenticated ? user?.id_token : undefined)
  }, [isAuthenticated, user?.id_token])

  useEffect(() => {
    if (!isAuthenticated && user?.access_token && !user?.expired) {
      signinSilent()
    }
  }, [isAuthenticated, signinSilent, user?.access_token, user?.expired])

  const router = createBrowserRouter([
    {
      path: '/',
      element: <App />,
      children: [
        {
          path: '',
          element: <Mailbox />,
          loader: args => ({emails: client.getEmails(args)})
        },
        {
          path: 'account/:aid/message/:mid',
          element: <Message />,
          loader: args => client.getEmail(args.params)
        },
        {
          path: 'compose',
          element: <Compose />,
          loader: args => getComposeData(client, args)
        }
      ]
    }
  ])

  return (
    <JMapClientContext.Provider value={client}>
      <RouterProvider router={router} />
    </JMapClientContext.Provider>)
}

