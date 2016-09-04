import {h, Component, render} from 'preact';
import {Router, Route} from '../../index';
import {Index, Pet, Pets, User, Users, NotFound} from '../generic';

const getHash = hash => {
	if (typeof hash === 'string' && hash.length) {
		if (hash.substring(0, 1) === '#') {
			return hash.substring(1);
		}
		return hash;
	}
	return '/';
};

const state = {
	location: getHash(window.location.hash),
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

class App extends Component {
	constructor() {
		super();
		this.state = state;
	}

	componentDidMount() {
		window.addEventListener('popstate', () => {
			this.setState({location: getHash(window.location.hash)});
		});
	}

	getChildContext() {
		return {
			navigate: path => {
				window.location.hash = path;
				this.setState({location: path});
			},
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
