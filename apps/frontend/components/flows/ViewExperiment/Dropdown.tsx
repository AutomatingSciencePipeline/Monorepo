import { Menu } from '@headlessui/react'

function HeaderDropdown( {headers} ) {
  return (
    <Menu>
      <Menu.Button>My account</Menu.Button>
      <Menu.Items>
        {headers.map((header) => (
          <Menu.Item key={header}>
          <a className="block data-[focus]:bg-blue-100">
            {header}
          </a>
        </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  )
}

export default HeaderDropdown;