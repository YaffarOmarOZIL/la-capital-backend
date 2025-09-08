import { Title, Text } from '@mantine/core';

function UserListPage() {
  return (
    <>
      <Title order={2} mb="md">Lista de Usuarios del Sistema</Title>
      <Text>Aquí se mostrará una tabla con todos los usuarios registrados (Administradores y Empleados).</Text>
      <Text>Próximamente: Funcionalidad de editar y eliminar usuarios.</Text>
    </>
  );
}

export default UserListPage;