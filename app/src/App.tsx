import { Avatar, Box, Button, Container, DropdownMenu, Flex, Section, Theme } from '@radix-ui/themes'
import { ThemeProvider } from 'next-themes'

import '@radix-ui/themes/styles.css'
import { IconMailPlus, IconUser } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { Outlet, useNavigate } from 'react-router-dom'
import './App.css'
import RouteLink from './components/RouteLink'

import IllustrationLogin from './assets/illustration_login.svg?react'
import logoPng from '/icon.png'
import logoWebP from '/icon.webp'

function App() {
  const auth = useAuth()
  const navigate = useNavigate()
  const urlCreator = window.URL || window.webkitURL
  const [userPicture, setUserPicture] = useState<Blob>()

  const composeButton = useMemo(() => (
    <Button key='1' ml='auto' onClick={() => navigate('/compose')}>
      <IconMailPlus stroke={1} size={24} />
    </Button>
  ), [navigate])

  const loginButton = useMemo(() => (
    <Button key='2' ml='auto' onClick={() => void auth.signinRedirect()}>
      <IconUser stroke={1} size={24} />
    </Button>
  ), [auth])

  const mainContent = useMemo(() => (
    <Section size="1">
      <Container size="3" align='center'>
        {auth.isAuthenticated ?
          <Outlet /> :
          <Flex justify='center'>
            <Box maxWidth='480px'>
              <IllustrationLogin width='100%' color='var(--accent-10)' />
            </Box>
          </Flex>}
      </Container>
    </Section>
  ), [auth.isAuthenticated])

  useEffect(() => {
    (async () => {
      if (auth.isAuthenticated && auth.user?.access_token) {
        const picture = await fetch(
          "https://graph.microsoft.com/v1.0/me/photo/$value",
          { headers: { 'Authorization': `Bearer ${auth.user?.access_token}` } })
        setUserPicture(await picture.blob())
      }
    })()
  }, [auth.isAuthenticated, auth.user?.access_token])

  const avatar = useMemo(() => (
    <DropdownMenu.Root key='3'>
      <DropdownMenu.Trigger>
        <Avatar
          src={userPicture ? urlCreator.createObjectURL(userPicture) : undefined}
          fallback={''}
          radius='full'
          style={{ alignSelf: 'flex-end', cursor: 'pointer' }} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item
          onClick={() => void auth.removeUser()}>Log out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ), [auth, urlCreator, userPicture])

  const logo = useMemo(() => (
    <Box
      height='40px'
      width='40px'
      style={{ alignSelf: 'center' }}>
      <picture>
        <source srcSet={logoWebP} />
        <source srcSet={logoPng} />
        <img src={logoPng}
          width='40px'
          height='40px' />
      </picture>
    </Box>
  ), [])

  return (
    <ThemeProvider attribute='class'>
      <Theme accentColor="tomato" grayColor="sand" radius="large">
        <Flex className='header' gap='2' p='2' align='center'>
          {logo}
          <RouteLink style={{ alignSelf: 'center', alignContent: 'baseline' }} to='/'>
            Mercury
          </RouteLink>
          {auth.isAuthenticated ? [composeButton, avatar] : loginButton}
        </Flex>
        {mainContent}
      </Theme>
    </ThemeProvider>
  )
}

export default App
