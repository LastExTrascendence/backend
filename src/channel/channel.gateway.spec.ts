
// import { Test, TestingModule } from '@nestjs/testing';
// import { ChannelGateWay } from './channel.gateway';

// describe('ChannelGateWay', () => {
//   let roomGateway: ChannelGateWay;

//   beforeEach(async () => {
//     const app: TestingModule = await Test.createTestingModule({
//       providers: [ChannelGateWay],
//     }).compile();

//     roomGateway = app.get<ChannelGateWay>(ChannelGateWay);
//   });

//   it('should create a room', () => {
//     const roomName = 'Test Room';
//     roomGateway.handleRoomCreation(roomName);
//     // 방이 생성되었는지 확인하는 로직을 작성합니다.
//     // 예를 들어, roomGateway.channel.has(roomName)을 사용하여 방이 생성되었는지 확인할 수 있습니다.
//     expect(roomGateway.channel.has(roomName)).toBe(true);
//   });

//   it('should add a user to a room', () => {
//     const roomName = 'Test Room';
//     const userId = 'user123';
//     roomGateway.handleRoomCreation(roomName);
//     roomGateway.handleJoinRoom(roomName, userId);
//     // 사용자가 방에 추가되었는지 확인하는 로직을 작성합니다.
//     // 예를 들어, roomGateway.channel.get(roomName).includes(userId)를 사용하여 사용자가 방에 추가되었는지 확인할 수 있습니다.
//     expect(roomGateway.channel.get(roomName)?.includes(userId)).toBe(true);
//   });

//   it('should remove a user from a room', () => {
//     const roomName = 'Test Room';
//     const userId = 'user123';
//     roomGateway.handleRoomCreation(roomName);
//     roomGateway.handleJoinRoom(roomName, userId);
//     roomGateway.handleLeaveRoom(roomName, userId);
//     // 사용자가 방에서 제거되었는지 확인하는 로직을 작성합니다.
//     // 예를 들어, roomGateway.channel.get(roomName).includes(userId)를 사용하여 사용자가 방에 더 이상 포함되지 않았는지 확인할 수 있습니다.
//     expect(roomGateway.channel.get(roomName)?.includes(userId)).toBe(false);
//   });

//   // ... (다른 테스트 케이스 추가 가능)

// });

// // import { Test, TestingModule } from '@nestjs/testing';
// // import { EventsGateway } from './channel.gateway';

// // describe('EventsGateway', () => {
// //   let gateway: EventsGateway;

// //   beforeEach(async () => {
// //     const module: TestingModule = await Test.createTestingModule({
// //       providers: [EventsGateway],
// //     }).compile();

// //     gateway = module.get<EventsGateway>(EventsGateway);
// //   });

// //   it('should be defined', () => {
// //     expect(gateway).toBeDefined();
// //   });
// // });
