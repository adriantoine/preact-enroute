import {h} from 'preact';

// note this is just an example, this package does not provide
// a Link equivalent found in react-router, nor does it provide
// bindings for tools like Redux. You'll need to wire these up
// as desired.
function Link({to, children}, {navigate}) {
  function click(e) {
    e.preventDefault();
    navigate(to);
  }

  return (<a href={to} onClick={click}>
    {children}
  </a>);
}

const User = ({users, pets, params: {id}}) => {
  const user = users.filter(u => u.id === parseInt(id, 10))[0];
  const userPets = pets.filter(p => p.userId === parseInt(id, 10));
  return (
    <div>
      <p>{user.name} has {userPets.length} pets:</p>
      <ul>
        {userPets.map(pet => {
          return (<li key={pet.id}>
            <Link to={`/pets/${pet.id}`}>{pet.name}</Link>
          </li>);
        })}
      </ul>
    </div>
  );
};

function Pets({pets, children}) {
  return (
    <div>
      <h2>Pets</h2>
      <ul>
        {pets.map(pet => {
          return (<li key={pet.id}>
            <Link to={`/pets/${pet.id}`}>{pet.name}</Link>
          </li>);
        })}
      </ul>
      {children}
    </div>
  );
}

const Pet = ({users, pets, params: {id}}) => {
  const pet = pets.filter(p => p.id === parseInt(id, 10))[0];
  const user = users.filter(u => u.id === pet.userId)[0];
  return <p>{pet.name} is a {pet.species} and is owned by <Link to={`/users/${user.id}`}>{user.name}</Link>.</p>;
};

function NotFound() {
  return <p>404 Not Found</p>;
}

const Index = ({children}) => {
  return (
    <div>
      <h1>Pet List</h1>
      <p>At least it is not a to-do list. Check out <Link to="/users">users</Link> or <Link to="/pets">pets</Link>.</p>
      {children}
    </div>
  );
};

const Users = ({users, children}) => {
  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => {
          return (<li key={user.id}>
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>);
        })}
      </ul>
      {children}
    </div>
  );
};

export {Index, Pet, Pets, User, Users, NotFound, Link};
