const createFabricClient = require('./createFabricClient');
const invoke = require('./invoke');
const registerChaincodeEventListener = require('./registerChaincodeEventListener');
const testSetup = require('../../test/testSetup');
const {
    keyStorePath, channelId, peer, chaincodeId, userId, orderer
} = require('../../test/config');

beforeAll(testSetup);

test('Can listen for an event when a car is created', async (done) => {
    const fabricClientListener = await createFabricClient(keyStorePath);
    const listener = await registerChaincodeEventListener({
        fabricClient: fabricClientListener,
        chaincode: chaincodeId,
        channelId,
        peer,
        userId,
        eventId: 'CAR_CREATED',
        /**
         * Callback when the event is triggered. Returns a payload which has the event data.
         */
        onEvent: (payload) => {
            expect(payload).toEqual({
                color: 'Gray',
                make: 'Dacia',
                model: 'Duster',
                owner: 'Michel'
            });
            listener.stopListening();
            done();
        },
        /**
         * Called when the listener gets disconnected
         */
        onDisconnect: (error, eventId) => {
            expect(`Should not have disconnected ${eventId} ${JSON.stringify(error)}`).toBeFalsy();
            done();
        }
    });
    const randomId = `CAR${Math.floor(Math.random() * 1000000)}`;

    const fabricClientInvoke = await createFabricClient(keyStorePath);
    await invoke({
        fabricClient: fabricClientInvoke,
        channelId,
        chaincode: {
            id: chaincodeId,
            fcn: 'createCar',
            args: [randomId, 'Dacia', 'Duster', 'Gray', 'Michel']
        },
        peers: [peer],
        orderer,
        userId
    });
});

test('Stops listening for events when the stopListening method is called', async (done) => {
    const fabricClientListener = await createFabricClient(keyStorePath);
    const listener = await registerChaincodeEventListener({
        fabricClient: fabricClientListener,
        chaincode: chaincodeId,
        channelId,
        peer,
        userId,
        eventId: 'CAR_CREATED',
        /**
         * Callback when the event is triggered. Returns a payload which has the event data.
         */
        onEvent: () => {
            expect('Event should not have been called').toBeFalsy();
            done();
        },
        /**
         * Called when the listener gets disconnected
         */
        onDisconnect: (error, eventId) => {
            expect(`Should not have disconnected ${eventId} ${JSON.stringify(error)}`).toBeFalsy();
            done();
        }
    });

    // Stop listening for events
    listener.stopListening();

    const randomId = `CAR${Math.floor(Math.random() * 1000000)}`;
    const fabricClientInvoke = await createFabricClient(keyStorePath);
    await invoke({
        fabricClient: fabricClientInvoke,
        channelId,
        chaincode: {
            id: chaincodeId,
            fcn: 'createCar',
            args: [randomId, 'Opel', 'Astra', 'Red', 'Tom']
        },
        peers: [peer],
        orderer,
        userId
    });

    setTimeout(() => {
        // Event was not called, test is fine
        done();
    }, 30000);
}, 60000);
