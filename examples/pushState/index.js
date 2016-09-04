
import {h, Component, render} from 'preact';
import {Router, Route} from '../../index';

const state = {
	location: window.location.pathname,
	users: [
		{id: 1, name: 'Bob'},
		{id: 2, name: 'Joe'},
	],
	pets: [
		{id: 1, userId: 1, name: 'Tobi', species: 'Ferret'},
		{id: 2, userId: 1, name: 'Loki', species: 'Ferret'},
		{id: 3, userId: 1, name: 'Jane', species: 'Ferret'},
		{id: 4, userId: 2, name: 'Manny', species: 'Cat'},
		{id: 5, userId: 2, name: 'Luna', species: 'Cat'},
	],
};

// note this is just an example, this package does not provide
// a Link equivalent found in react-router, nor does it provide
// bindings for tools like Redux. You'll need to wire these up
// as desired.
function Link({to, children}, {navigate}) {
	function click(e) {
		e.preventDefault();
		history.pushState(null, '', to);
		navigate(to);
	}

	return (<a href={to} onClick={click}>
		{children}
	</a>);
}

let User = ({user, pets}) => {
	return (
		<div>
			<p>{user.name} has {pets.length} pets:</p>
			<ul>
				{pets.map(pet => {
					return (<li key={pet.id}>
						<Link to={`/pets/${pet.id}`}>{pet.name}</Link>
					</li>);
				})}
			</ul>
		</div>
	);
};

User = (fn => {
	return ({users, pets, params: {id}}) => {
		return fn({
			user: users.filter(u => u.id === parseInt(id, 10))[0],
			pets: pets.filter(p => p.userId === parseInt(id, 10)),
		});
	};
})(User);

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

let Pet = ({user, pet}) => {
	return <p>{pet.name} is a {pet.species} and is owned by <Link to={`/users/${user.id}`}>{user.name}</Link>.</p>;
};

Pet = (fn => {
	return ({users, pets, params: {id}}) => {
		const pet = pets.filter(p => p.id === parseInt(id, 10))[0];
		const user = users.filter(u => u.id === pet.userId)[0];
		return fn({user, pet});
	};
})(Pet);

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

class App extends Component {
	constructor() {
		super();
		this.state = state;
	}

	componentDidMount() {
		window.addEventListener('popstate', () => {
			this.setState({location: window.location.pathname});
		});
	}

	getChildContext() {
		return {
			navigate: path => this.setState({location: path}),
		};
	}

	render() {
		return (
			<Router {...this.state}>
				<Route path="/" component={Index}/>
				<Route path="/users" component={Users}/>
				<Route path="/users/:id" component={User}/>
				<Route path="/pets" component={Pets}/>
				<Route path="/pets/:id" component={Pet}/>
				<Route path="*" component={NotFound}/>
			</Router>
		);
	}
}

render(<App/>, document.body);
