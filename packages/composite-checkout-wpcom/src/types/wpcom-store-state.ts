/*
 * All child components in composite checkout are controlled -- they accept
 * data from their parents and evaluate callbacks when edited, rather than
 * managing their own state. Hooks providing this data in turn need some extra
 * data on each field: specifically whether it has been edited by the user
 * or passed validation. We wrap this extra data into an object type.
 */
interface ManagedValue< T > {
	value: T;
	isTouched: boolean; // Has value been edited by the user?
	errors: string[]; // Has value passed validation?
}

export function isValid< T >( arg: ManagedValue< T > ): boolean {
	return arg.errors?.length <= 0;
}

function initialManagedValue< T >( value: T ): ManagedValue< T > {
	return {
		value: value,
		isTouched: false,
		errors: [ '' ],
	};
}

function touchIfDifferent< T >( newValue: T, oldData: ManagedValue< T > ): ManagedValue< T > {
	return newValue === oldData.value ? oldData : { ...oldData, value: newValue, isTouched: true };
}

function setErrors< T >(
	errors: string[] | undefined,
	oldData: ManagedValue< T >
): ManagedValue< T > {
	return undefined === errors ? { ...oldData, errors: [] } : { ...oldData, errors };
}

/*
 * The wpcom store hook stores an object with all the contact info
 * which is used to share state across fields where appropriate.
 * Each value keeps track of whether it has been edited and validated.
 */
export type ManagedContactDetails = {
	firstName: ManagedValue< string >;
	lastName: ManagedValue< string >;
	organization: ManagedValue< string >;
	email: ManagedValue< string >;
	alternateEmail: ManagedValue< string >;
	phone: ManagedValue< string >;
	phoneNumberCountry: ManagedValue< string >;
	address1: ManagedValue< string >;
	address2: ManagedValue< string >;
	city: ManagedValue< string >;
	state: ManagedValue< string >;
	postalCode: ManagedValue< string >;
	countryCode: ManagedValue< string >;
	fax: ManagedValue< string >;
	vatId: ManagedValue< string >;
};

export const defaultManagedContactDetails: ManagedContactDetails = {
	firstName: initialManagedValue( '' ),
	lastName: initialManagedValue( '' ),
	organization: initialManagedValue( '' ),
	email: initialManagedValue( '' ),
	alternateEmail: initialManagedValue( '' ),
	phone: initialManagedValue( '' ),
    phoneNumberCountry: initialManagedValue( '' ),
	address1: initialManagedValue( '' ),
	address2: initialManagedValue( '' ),
	city: initialManagedValue( '' ),
	state: initialManagedValue( '' ),
	postalCode: initialManagedValue( '' ),
	countryCode: initialManagedValue( '' ),
	fax: initialManagedValue( '' ),
	vatId: initialManagedValue( '' ),
};

export function isCompleteAndValid( details: ManagedContactDetails ): boolean {
	const values = Object.keys( details ).map( key => details[ key ] );
	return values.every( isValid ) && values.length > 0;
}

/*
 * List of error messages for each field.
 */
export type ManagedContactDetailsErrors = {
	firstName?: string[];
	lastName?: string[];
	organization?: string[];
	email?: string[];
	alternateEmail?: string[];
	phone?: string[];
	address1?: string[];
	address2?: string[];
	city?: string[];
	state?: string[];
	postalCode?: string[];
	countryCode?: string[];
	fax?: string[];
	vatId?: string[];
};

function setManagedContactDetailsErrors(
	errors: ManagedContactDetailsErrors,
	details: ManagedContactDetails
): ManagedContactDetails {
	return {
		firstName: setErrors( errors.firstName, details.firstName ),
		lastName: setErrors( errors.firstName, details.lastName ),
		organization: setErrors( errors.organization, details.organization ),
		email: setErrors( errors.email, details.email ),
		alternateEmail: setErrors( errors.alternateEmail, details.alternateEmail ),
		phone: setErrors( errors.phone, details.phone ),
		address1: setErrors( errors.address1, details.address1 ),
		address2: setErrors( errors.address2, details.address2 ),
		city: setErrors( errors.city, details.city ),
		state: setErrors( errors.state, details.state ),
		postalCode: setErrors( errors.postalCode, details.postalCode ),
		countryCode: setErrors( errors.countryCode, details.countryCode ),
		fax: setErrors( errors.fax, details.fax ),
		vatId: setErrors( errors.vatId, details.vatId ),
	};
}

/*
 * The data model used in the ContactDetailsFormFields component.
 * This belongs in components/domains/contact-details-form-fields, but until
 * that component is rewritten in TypeScript we'll put it here.
 */
export type DomainContactDetails = {
	firstName: string;
	lastName: string;
	organization: string;
	email: string;
	alternateEmail: string;
	phone: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	postalCode: string;
	countryCode: string;
	fax: string;
};

/*
 * Convert a ManagedContactDetails object (used internally by the
 * WPCOM store state hook) into a DomainContactDetails object (used by
 * the ContactDetailsFormFields component)
 */
export function prepareDomainContactDetails(
	details: ManagedContactDetails
): DomainContactDetails {
	return {
		firstName: details.firstName.value,
		lastName: details.lastName.value,
		organization: details.organization.value,
		email: details.email.value,
		alternateEmail: details.alternateEmail.value,
		phone: details.phone.value,
		address1: details.address1.value,
		address2: details.address2.value,
		city: details.city.value,
		state: details.state.value,
		postalCode: details.postalCode.value,
		countryCode: details.countryCode.value,
		fax: details.fax.value,
	};
}

/*
 * Helper type which bundles the field updaters in a single object
 * to help keep import lists under control. All updaters should
 * assume input came from the user.
 */
export type ManagedContactDetailsUpdaters = {
	updateDomainFields: ( ManagedContactDetails, DomainContactDetails ) => ManagedContactDetails;
	updatePhone: ( ManagedContactDetails, string ) => ManagedContactDetails;
	updatePostalCode: ( ManagedContactDetails, string ) => ManagedContactDetails;
	updateCountryCode: ( ManagedContactDetails, string ) => ManagedContactDetails;
	updateVatId: ( ManagedContactDetails, string ) => ManagedContactDetails;
	setErrorMessages: ( ManagedContactDetails, ManagedContactDetailsErrors ) => ManagedContactDetails;
};

export const managedContactDetailsUpdaters: ManagedContactDetailsUpdaters = {
	updateDomainFields: (
		oldDetails: ManagedContactDetails,
		newDetails: DomainContactDetails
	): ManagedContactDetails => {
		return {
			...oldDetails,
			firstName: touchIfDifferent( newDetails.firstName, oldDetails.firstName ),
			lastName: touchIfDifferent( newDetails.lastName, oldDetails.lastName ),
			organization: touchIfDifferent( newDetails.organization, oldDetails.organization ),
			email: touchIfDifferent( newDetails.email, oldDetails.email ),
			alternateEmail: touchIfDifferent( newDetails.alternateEmail, oldDetails.alternateEmail ),
			phone: touchIfDifferent( newDetails.phone, oldDetails.phone ),
			address1: touchIfDifferent( newDetails.address1, oldDetails.address1 ),
			address2: touchIfDifferent( newDetails.address2, oldDetails.address2 ),
			city: touchIfDifferent( newDetails.city, oldDetails.city ),
			state: touchIfDifferent( newDetails.state, oldDetails.state ),
			postalCode: touchIfDifferent( newDetails.postalCode, oldDetails.postalCode ),
			countryCode: touchIfDifferent( newDetails.countryCode, oldDetails.countryCode ),
			fax: touchIfDifferent( newDetails.fax, oldDetails.fax ),
		};
	},

	updatePhone: ( oldDetails: ManagedContactDetails, newPhone: string ): ManagedContactDetails => {
		return {
			...oldDetails,
			phone: touchIfDifferent( newPhone, oldDetails.phone ),
		};
	},

	updatePostalCode: (
		oldDetails: ManagedContactDetails,
		newPostalCode: string
	): ManagedContactDetails => {
		return {
			...oldDetails,
			postalCode: touchIfDifferent( newPostalCode, oldDetails.postalCode ),
		};
	},

	updateCountryCode: (
		oldDetails: ManagedContactDetails,
		newCountryCode: string
	): ManagedContactDetails => {
		return {
			...oldDetails,
			countryCode: touchIfDifferent( newCountryCode, oldDetails.countryCode ),
		};
	},

	updateVatId: ( oldDetails: ManagedContactDetails, newVatId: string ): ManagedContactDetails => {
		return {
			...oldDetails,
			vatId: touchIfDifferent( newVatId, oldDetails.vatId ),
		};
	},

	setErrorMessages: (
		oldDetails: ManagedContactDetails,
		errors: ManagedContactDetailsErrors
	): ManagedContactDetails => {
		return setManagedContactDetailsErrors( errors, oldDetails );
	},
};

export type WpcomStoreState = {
	siteId: string;
	contactDetails: ManagedContactDetails;
};

export const initialWpcomStoreState: WpcomStoreState = {
	siteId: '',
	contactDetails: defaultManagedContactDetails,
};
