const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jjepcue.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({message: "unauthorized access"});
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN__SECRET, function(err, decoded){
    if (err) {
      return res.status(403).send({message: "forbidden access"});
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("mobile_panda").collection("services");
    const orderCollection = client.db("mobile_panda").collection("orders");
    const reviewCollection = client.db("mobile_panda").collection("reviews");
    const userCollection = client.db("mobile_panda").collection("users");

    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === "admin";
      res.send({admin: isAdmin});
    });

    // make admin
    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester});
      if(requesterAccount.role === "admin") {
        const filter = { email: email };
      const updateDoc = {
        $set: {role: "admin"},
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
      } else {
        res.status(403).send({message: "forbidden access"});
      }
    })

    // make user 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN__SECRET, {expiresIn: '1d'});
      res.send({result, token});
    })

    // get all services
    app.get("/service", async (req, res) => {
      const cursor = serviceCollection.find({});
      const services = await cursor.toArray();
      res.send(services);
    });

    // get single service
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    // delete service
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    // make order
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });

    // get all orders
    app.get('/order', async(req,res)=>{
      const query ={}
      const cursor = orderCollection.find(query)
      const allOrder = await cursor.toArray()
      res.send(allOrder)
    })

    // get order by email
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const decodedEmail = req.decoded.email;
      if(email === decodedEmail){
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      } else {
        res.status(403).send({message: "forbidden access"});
      }
    });

    // get single order by id
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // for update
    app.put('/order/:id', async (req, res) => {
      const updateOrder = req.body[0];
      const id = req.params.id;
      // console.log(updateOrder);
      const filter = { _id: ObjectId(id) };

      const options = { upsert: true };

      const updateDoc = {
          $set: {
              email: updateOrder.email,
              price: updateOrder.price,
              status: updateOrder.status,
              description: updateOrder.description
          }
      };
      const result = await orderCollection.updateOne(filter, updateDoc, options);
      // console.log(result);
      res.send(result);
  });


    // delete order
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    // add review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });

    // get all reviews
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Mobile Panda!");
});

app.listen(port, () => {
  console.log(`Panda listening on port ${port}`);
});
