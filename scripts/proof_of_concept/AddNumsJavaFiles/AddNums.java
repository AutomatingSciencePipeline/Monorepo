public class AddNums {

    public static void main(String[] args){
        String filename = args[0];
        PropParser.load(filename);
        int x = Integer.parseInt(PropParser.getProperty("x"));
        int y = Integer.parseInt(PropParser.getProperty("y"));
        System.out.println(x + y);
    }
}
