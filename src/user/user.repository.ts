// import { DataSource, Repository } from "typeorm";
// import { InjectRepository } from "@nestjs/typeorm";
// import { User } from "./user.entity";
// import { UserCredentialsDto } from './dto/user.dto'

// export class UserRepository extends Repository<User> {
//     constructor(@InjectRepository(User) private dataSource: DataSource) {
//         super(User, dataSource.manager);
//     }

//     // async createUser(authCredentialsDto: UserCredentialsDto): Promise<void> {
//     //     const {IntraId, nickname} = authCredentialsDto;
//     //     const user = this.create({IntraId, nickname});

//     //     await this.save(user);
//     // }

// }
