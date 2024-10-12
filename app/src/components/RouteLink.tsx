import { Link, LinkProps } from "@radix-ui/themes";
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

type Props = RouterLinkProps & LinkProps & React.RefAttributes<HTMLAnchorElement>

export default function RouteLink(props: Props) {
  const linkProps: LinkProps = {...props}
  const routeProps: RouterLinkProps = {...props}
  return (
  <Link asChild {...linkProps}>
    <RouterLink {...routeProps} />
  </Link>
  )
}
